using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed class BillingActions(KidsfitDbContext db)
{
    public async Task<object> RecordPayment(long invoiceId, RecordPaymentRequest request, long actorId, HttpContext http)
    {
        var key = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu mã chống tạo trùng.", 120);
        var method = Validation.Required(request.PaymentMethod, "payment_method", "Vui lòng chọn phương thức thanh toán.", 32).ToUpperInvariant();
        if (!new[] { "CASH", "BANK_TRANSFER", "CARD", "OTHER" }.Contains(method)) throw ApiValidationException.For("payment_method", "Phương thức thanh toán không hợp lệ.");
        if (request.Amount <= 0 || decimal.Truncate(request.Amount) != request.Amount) throw ApiValidationException.For("amount", "Số tiền phải là số nguyên dương theo đơn vị đồng.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var invoice = await db.Invoices.FromSqlInterpolated($"SELECT * FROM invoices WHERE id = {invoiceId} FOR UPDATE").SingleOrDefaultAsync() ?? throw new KeyNotFoundException();
        var existing = await db.Payments.SingleOrDefaultAsync(x => x.IdempotencyKey == key);
        if (existing is not null)
        {
            if (existing.InvoiceId != invoiceId) throw ApiValidationException.For("idempotency_key", "Mã chống trùng đã được dùng cho hóa đơn khác.");
            var existingResult = await Result(existing.Id);
            await transaction.CommitAsync();
            return existingResult;
        }
        if (invoice.Status is "CANCELLED" or "REFUNDED") throw ApiValidationException.For("invoice", "Hóa đơn không còn nhận thanh toán.");
        if (invoice.RemainingAmount <= 0) throw ApiValidationException.For("invoice", "Hóa đơn đã được thanh toán đủ.");
        if (request.Amount > invoice.RemainingAmount) throw ApiValidationException.For("amount", $"Số tiền vượt quá công nợ còn lại {invoice.RemainingAmount:N0} ₫.");
        var now = DateTime.UtcNow;
        var payment = new Payment { InvoiceId = invoiceId, ParentId = invoice.ParentId, StudentId = invoice.StudentId, PaymentMethod = method, Amount = request.Amount, PaymentDate = request.PaymentDate is null ? now : ToUtc(request.PaymentDate.Value), ReferenceCode = "PENDING-" + Guid.NewGuid().ToString("N"), IdempotencyKey = key, Status = "COMPLETED", CreatedBy = actorId, CreatedAt = now, UpdatedAt = now };
        db.Payments.Add(payment);
        await db.SaveChangesAsync();
        payment.ReferenceCode = $"PAY-{now.Year}-{payment.Id:00000}";
        invoice.PaidAmount = await db.Payments.Where(x => x.InvoiceId == invoiceId && x.Status == "COMPLETED").SumAsync(x => x.Amount);
        invoice.RemainingAmount = invoice.FinalAmount - invoice.PaidAmount;
        invoice.Status = invoice.RemainingAmount == 0 ? "PAID" : invoice.DueAt < now ? "OVERDUE" : "PARTIAL";
        invoice.UpdatedAt = now;
        Audit.Add(db, actorId, "RECORD_PAYMENT", "Payment", payment.Id, null, new { invoice_id = invoiceId, amount = request.Amount, payment_method = method, invoice_status = invoice.Status }, http);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await Result(payment.Id);
    }

    public async Task CompleteTask(long taskId, long actorId, HttpContext http)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var task = await db.Tasks.FromSqlInterpolated($"SELECT * FROM tasks WHERE id = {taskId} FOR UPDATE").SingleOrDefaultAsync();
        if (task is null || task.AssignedTo != actorId) throw new KeyNotFoundException();
        if (task.Status != "COMPLETED")
        {
            var oldStatus = task.Status;
            task.Status = "COMPLETED"; task.UpdatedAt = DateTime.UtcNow;
            Audit.Add(db, actorId, "COMPLETE", "Task", taskId, new { status = oldStatus }, new { status = "COMPLETED" }, http);
            await db.SaveChangesAsync();
        }
        await transaction.CommitAsync();
    }

    private async Task<object> Result(long paymentId) => await (
        from payment in db.Payments
        join invoice in db.Invoices on payment.InvoiceId equals invoice.Id
        where payment.Id == paymentId
        select new { payment.Id, payment.InvoiceId, payment.ReferenceCode, payment.Amount, payment.PaymentMethod, payment.PaymentDate, payment_status = payment.Status, invoice.PaidAmount, invoice.RemainingAmount, invoice_status = invoice.Status }).SingleAsync();

    private static DateTime ToUtc(DateTime value) => value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
}
