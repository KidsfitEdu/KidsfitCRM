using System.Security.Cryptography;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Private evidence storage; authorization applies to uploads AND downloads.</summary>
public static class FinancialEvidenceEndpoints
{
    private const int MaxBytes = 5 * 1024 * 1024;

    public static async Task<IResult> Upload(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        if (!http.Request.HasFormContentType) throw ApiValidationException.For("file", "Cần gửi form multipart có ảnh hoặc hợp đồng.");
        var form = await http.Request.ReadFormAsync(ct);
        var kind = form["kind"].ToString().Trim().ToUpperInvariant();
        if (kind is not ("RECEIPT" or "PAYOUT" or "CONTRACT" or "RENEWAL"))
            throw ApiValidationException.For("kind", "Loại chứng từ không hợp lệ.");
        var file = form.Files.GetFile("file") ?? throw ApiValidationException.For("file", "Thiếu tệp chứng từ.");
        if (file.Length <= 0 || file.Length > MaxBytes)
            throw ApiValidationException.For("file", "Tệp phải có dung lượng từ 1 byte đến 5 MB.");
        var userId = http.UserId();
        var access = await ChannelSalesAccess.Load(db, userId, ct);
        long? contractId = null;
        long? payoutId = null;
        if (kind == "CONTRACT")
        {
            if (!access.Has(Permissions.ChannelSalesReportContract)) return Results.Forbid();
        }
        else if (kind == "RECEIPT")
        {
            if (!access.Has(Permissions.ChannelSalesRecordRevenue)) return Results.Forbid();
            if (!long.TryParse(form["contract_id"], out var id) || !await access.Contracts(db).AnyAsync(x => x.Id == id, ct))
                throw new KeyNotFoundException();
            contractId = id;
        }
        else
        {
            if (!access.Has(Permissions.ChannelSalesPayoutComplete)) return Results.Forbid();
            if (!long.TryParse(form["payout_id"], out var id) || !await access.Payouts(db).AnyAsync(x => x.Id == id, ct))
                throw new KeyNotFoundException();
            payoutId = id;
        }

        await using var stream = file.OpenReadStream();
        await using var memory = new MemoryStream();
        await stream.CopyToAsync(memory, ct);
        var bytes = memory.ToArray();
        var jpeg = bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF;
        var png = bytes.Length >= 8 && bytes[..8].SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });
        var webp = bytes.Length >= 12 && System.Text.Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF"
            && System.Text.Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP";
        var pdf = bytes.Length >= 5 && System.Text.Encoding.ASCII.GetString(bytes, 0, 5) == "%PDF-";
        if (!(jpeg || png || webp || (kind == "CONTRACT" && pdf)))
            throw ApiValidationException.For("file", kind == "CONTRACT"
                ? "Hợp đồng phải là PDF hoặc ảnh JPG/PNG/WEBP hợp lệ."
                : "Chứng từ chuyển khoản phải là ảnh JPG/PNG/WEBP hợp lệ.");
        var mime = jpeg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : "application/pdf";
        var originalName = Path.GetFileName(file.FileName);
        var safeName = new string(originalName.Where(x => char.IsLetterOrDigit(x) || x is '.' or '-' or '_').Take(120).ToArray());
        if (string.IsNullOrWhiteSpace(safeName)) safeName = "evidence";
        var now = DateTime.UtcNow;
        var proof = new FinancialEvidence
        {
            Kind = kind, ContractId = contractId, PayoutId = payoutId, UploadedByUserId = userId,
            FileName = safeName, MimeType = mime, Sha256 = Convert.ToHexString(SHA256.HashData(bytes)),
            Bytes = bytes, CreatedAt = now, UpdatedAt = now,
        };
        db.FinancialEvidences.Add(proof);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/channel-sales/evidence/{proof.Id}",
            new { data = new { id = proof.Id, kind = proof.Kind, file_name = proof.FileName } });
    }

    public static async Task<IResult> Download(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var proof = await db.FinancialEvidences.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException();
        var permitted = proof.AttachedAt is null
            ? proof.UploadedByUserId == http.UserId()
            : proof.PayoutId.HasValue && proof.Kind == "PAYOUT"
                ? await access.Payouts(db).AnyAsync(x => x.Id == proof.PayoutId.Value, ct)
                : proof.ContractId.HasValue
                    && (await access.Contracts(db).AnyAsync(x => x.Id == proof.ContractId.Value, ct)
                        || (proof.Kind == "CONTRACT" && access.Has(Permissions.SchoolContractReview)
                            && await db.SalesContracts.AnyAsync(c => c.Id == proof.ContractId.Value
                                && c.RequiresSchoolVerification
                                && (access.All || (access.Organization && access.OrganizationIds.Contains(c.OwnerOrganizationId))), ct))
                        || (proof.Kind == "CONTRACT" && access.Has(Permissions.ChannelSalesReconcile)
                            && await db.ReconciliationCases.AnyAsync(r => r.ContractId == proof.ContractId.Value
                                && access.OrganizationIds.Contains(r.CheckeeOrganizationId)
                                && db.SalesContracts.Any(c => c.Id == r.ContractId && c.ManagerReviewedAt != null
                                    && c.Status != "NEEDS_REVISION" && c.Status != "PENDING_REVIEW"), ct)));
        if (!permitted) throw new KeyNotFoundException();
        http.Response.Headers["Cache-Control"] = "private, no-store";
        http.Response.Headers["X-Content-Type-Options"] = "nosniff";
        return Results.File(proof.Bytes, "application/octet-stream", proof.FileName);
    }
}
