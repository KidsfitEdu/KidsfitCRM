using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// Drafts are non-financial staging records. Posting passes through the authoritative
/// revenue action exactly once, preserving all bank-proof and commission guards.
/// </summary>
public static class AccountingReceiptDraftEndpoints
{
    public sealed record DraftInput(
        long ContractId, long? RevenueScheduleId, decimal? Amount,
        DateTime? ReceivedAt, string? ReferenceCode, string? PaymentMethod);
    public sealed record PostInput(long EvidenceId);

    public static void Map(RouteGroupBuilder group)
    {
        group.MapGet("/accounting/receipt-drafts", List)
            .RequireAuthorization(Permissions.ChannelSalesRecordRevenue);
        group.MapPost("/accounting/receipt-drafts", Create)
            .RequireAuthorization(Permissions.ChannelSalesRecordRevenue);
        group.MapPatch("/accounting/receipt-drafts/{id:long}", Update)
            .RequireAuthorization(Permissions.ChannelSalesRecordRevenue);
        group.MapPost("/accounting/receipt-drafts/{id:long}/cancel", Cancel)
            .RequireAuthorization(Permissions.ChannelSalesRecordRevenue);
        group.MapPost("/accounting/receipt-drafts/{id:long}/post", Post)
            .RequireAuthorization(Permissions.ChannelSalesRecordRevenue);
    }

    private static void Validate(DraftInput request)
    {
        if (request.ContractId <= 0) throw ApiValidationException.For("contract_id", "Vui lòng chọn hợp đồng.");
        if (request.RevenueScheduleId is <= 0)
            throw ApiValidationException.For("revenue_schedule_id", "Đợt thanh toán không hợp lệ.");
        if (request.Amount.HasValue) ChannelSalesValidation.WholeDong(request.Amount.Value, "amount");
        if (request.ReferenceCode?.Trim().Length > 64)
            throw ApiValidationException.For("reference_code", "Mã giao dịch không vượt quá 64 ký tự.");
        if (request.PaymentMethod is not null && request.PaymentMethod != "BANK_TRANSFER")
            throw ApiValidationException.For("payment_method", "Chỉ hỗ trợ ghi nhận chuyển khoản ngân hàng.");
    }

    private static async Task VerifyScope(KidsfitDbContext db, ChannelSalesAccess access,
        long contractId, long? scheduleId, CancellationToken ct)
    {
        if (!await access.Contracts(db).AnyAsync(x =>
            x.Id == contractId && x.VerifiedAt.HasValue && x.Status == "ACTIVE", ct))
            throw new KeyNotFoundException();
        if (scheduleId.HasValue && !await db.RevenueSchedules.AnyAsync(x =>
            x.ContractId == contractId && x.Id == scheduleId.Value
                && x.AmountReceived < x.AmountDue, ct))
            throw ApiValidationException.For("revenue_schedule_id",
                "Đợt thanh toán không thuộc hợp đồng hoặc không còn phải thu.");
    }

    private static async Task<ChannelSalesAccess> Require(HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesRecordRevenue)) throw new UnauthorizedAccessException();
        return access;
    }

    public static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? search, int? page, int? page_size, CancellationToken ct)
    {
        var access = await Require(http, db, ct);
        var pn = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        var contractScope = access.Contracts(db).AsNoTracking();
        var query = from draft in db.RevenueReceiptDrafts.AsNoTracking()
                    join contract in contractScope on draft.ContractId equals contract.Id
                    join school in db.ChannelCustomers.AsNoTracking()
                        on contract.CustomerId equals school.Id
                    where draft.CreatedByUserId == access.UserId && draft.Status == "DRAFT"
                    select new { draft, contract, school };
        if (term.Length > 0)
            query = query.Where(x => x.school.DisplayName.Contains(term)
                || x.contract.ContractCode.Contains(term)
                || (x.draft.ReferenceCode != null && x.draft.ReferenceCode.Contains(term)));
        var total = await query.CountAsync(ct);
        var data = await query.OrderByDescending(x => x.draft.UpdatedAt)
            .ThenByDescending(x => x.draft.Id).Skip((pn-1)*size).Take(size)
            .Select(x => new {
                id = x.draft.Id, contract_id = x.draft.ContractId,
                contract_code = x.contract.ContractCode, school_name = x.school.DisplayName,
                schedule_id = x.draft.RevenueScheduleId,
                amount = x.draft.Amount, received_at = x.draft.ReceivedAt,
                reference_code = x.draft.ReferenceCode,
                payment_method = x.draft.PaymentMethod, status = x.draft.Status,
                created_at = x.draft.CreatedAt, updated_at = x.draft.UpdatedAt
            }).ToArrayAsync(ct);
        return Results.Ok(new { data, total, page = pn, page_size = size });
    }

    public static async Task<IResult> Create(DraftInput request, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await Require(http, db, ct);
        Validate(request);
        await VerifyScope(db, access, request.ContractId, request.RevenueScheduleId, ct);
        var now = DateTime.UtcNow;
        var draft = new RevenueReceiptDraft {
            ContractId = request.ContractId,
            RevenueScheduleId = request.RevenueScheduleId,
            Amount = request.Amount,
            ReceivedAt = request.ReceivedAt,
            ReferenceCode = request.ReferenceCode?.Trim().ToUpperInvariant(),
            PaymentMethod = "BANK_TRANSFER",
            CreatedByUserId = access.UserId,
            Status = "DRAFT", CreatedAt = now, UpdatedAt = now
        };
        db.RevenueReceiptDrafts.Add(draft);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, access.UserId, "CREATE_RECEIPT_DRAFT", nameof(RevenueReceiptDraft),
            draft.Id, null, new { draft.ContractId, draft.RevenueScheduleId, draft.Amount }, http);
        await db.SaveChangesAsync(ct);
        return Results.Created("/api/channel-sales/accounting/receipt-drafts/" + draft.Id,
            new { data = new { draft.Id } });
    }

    public static async Task<IResult> Update(long id, DraftInput request, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await Require(http, db, ct);
        Validate(request);
        var draft = await db.RevenueReceiptDrafts.SingleOrDefaultAsync(x =>
            x.Id == id && x.CreatedByUserId == access.UserId, ct) ?? throw new KeyNotFoundException();
        if (draft.Status != "DRAFT") throw new ApiConflictException("Chỉ được sửa khoản thu Nháp.");
        if (draft.ContractId != request.ContractId)
            throw ApiValidationException.For("contract_id", "Không thể chuyển nháp sang hợp đồng khác.");
        await VerifyScope(db, access, draft.ContractId, request.RevenueScheduleId, ct);
        var before = new { draft.RevenueScheduleId, draft.Amount, draft.ReceivedAt, draft.ReferenceCode };
        draft.RevenueScheduleId = request.RevenueScheduleId;
        draft.Amount = request.Amount;
        draft.ReceivedAt = request.ReceivedAt;
        draft.ReferenceCode = request.ReferenceCode?.Trim().ToUpperInvariant();
        draft.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, access.UserId, "EDIT_RECEIPT_DRAFT", nameof(RevenueReceiptDraft),
            draft.Id, before,
            new { draft.RevenueScheduleId, draft.Amount, draft.ReceivedAt, draft.ReferenceCode }, http);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { message = "Đã cập nhật khoản thu Nháp." });
    }

    public static async Task<IResult> Cancel(long id, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await Require(http, db, ct);
        var draft = await db.RevenueReceiptDrafts.SingleOrDefaultAsync(x =>
            x.Id == id && x.CreatedByUserId == access.UserId, ct) ?? throw new KeyNotFoundException();
        if (!await access.Contracts(db).AnyAsync(x => x.Id == draft.ContractId, ct))
            throw new KeyNotFoundException();
        if (draft.Status != "DRAFT") throw new ApiConflictException("Không thể hủy khoản thu đã ghi nhận.");
        draft.Status = "CANCELLED"; draft.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, access.UserId, "CANCEL_RECEIPT_DRAFT", nameof(RevenueReceiptDraft),
            draft.Id, new { status = "DRAFT" }, new { status = draft.Status }, http);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { message = "Đã hủy khoản thu Nháp." });
    }

    public static async Task<IResult> Post(long id, PostInput request, HttpContext http,
        KidsfitDbContext db, ChannelSalesActions actions, CancellationToken ct)
    {
        var access = await Require(http, db, ct);
        var draft = await db.RevenueReceiptDrafts.SingleOrDefaultAsync(x =>
            x.Id == id && x.CreatedByUserId == access.UserId, ct) ?? throw new KeyNotFoundException();
        if (!await access.Contracts(db).AnyAsync(x => x.Id == draft.ContractId, ct))
            throw new KeyNotFoundException();
        if (draft.Status == "POSTED" && draft.PostedReceiptId.HasValue)
            return Results.Ok(new { data = new { id = draft.PostedReceiptId.Value } });
        if (draft.Status != "DRAFT") throw new ApiConflictException("Nháp không còn được ghi nhận.");
        if (draft.RevenueScheduleId is null || draft.Amount is null || draft.ReceivedAt is null
            || string.IsNullOrWhiteSpace(draft.ReferenceCode))
            throw ApiValidationException.For("draft", "Vui lòng hoàn tất đợt thu, số tiền, ngày nhận và mã giao dịch.");
        if (request.EvidenceId <= 0)
            throw ApiValidationException.For("evidence_id", "Bắt buộc có ảnh chuyển khoản.");

        // The authoritative action checks evidence, money limits, policy, idempotency
        // and creates the role-specific commission ledger. Never duplicate this logic.
        var receiptId = await actions.RecordRevenueReceipt(draft.ContractId,
            new RecordRevenueReceiptRequest("ACCOUNTING-DRAFT-" + draft.Id,
                draft.RevenueScheduleId, draft.Amount.Value, draft.ReceivedAt,
                draft.ReferenceCode, "BANK_TRANSFER", request.EvidenceId),
            access.UserId, http, ct);
        draft.Status = "POSTED";
        draft.PostedReceiptId = receiptId;
        draft.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, access.UserId, "POST_RECEIPT_DRAFT", nameof(RevenueReceiptDraft),
            draft.Id, new { status = "DRAFT" },
            new { status = "POSTED", receipt_id = receiptId }, http);
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { data = new { id = receiptId } });
    }
}
