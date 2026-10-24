using System.Data;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed class LeadActions(KidsfitDbContext db)
{
    public async Task<long> Create(CreateLeadRequest request, long actorId, HttpContext http)
    {
        var fullName = Validation.Required(request.FullName, "full_name", "Vui lòng nhập tên người liên hệ.", 190);
        var phone = Validation.Required(request.Phone, "phone", "Vui lòng nhập số điện thoại.", 40);
        if (!await db.LeadSources.AnyAsync(x => x.Id == request.SourceId && x.IsActive)) throw ApiValidationException.For("source_id", "Nguồn lead không hợp lệ.");
        if (request.InterestedCourseId is not null && !await db.Courses.AnyAsync(x => x.Id == request.InterestedCourseId && x.Status == "ACTIVE")) throw ApiValidationException.For("interested_course_id", "Khóa học không hợp lệ.");
        var assignedId = request.AssignedUserId ?? actorId;
        if (!await db.Users.AnyAsync(x => x.Id == assignedId && x.Status == "ACTIVE")) throw ApiValidationException.For("assigned_user_id", "Nhân viên phụ trách không hợp lệ.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var now = DateTime.UtcNow;
        var newStatusId = await db.LeadStatuses.Where(x => x.Code == "NEW").Select(x => x.Id).SingleAsync();
        var lead = new Lead
        {
            Code = TemporaryCode(), FullName = fullName, Phone = phone, PhoneNormalized = Validation.Digits(phone),
            Email = request.Email?.Trim(), SourceId = request.SourceId, StatusId = newStatusId,
            InterestedCourseId = request.InterestedCourseId, AssignedUserId = assignedId, Note = request.Note?.Trim(),
            NextFollowUpAt = Utc(request.NextFollowUpAt), CreatedAt = now, UpdatedAt = now,
        };
        db.Leads.Add(lead);
        await db.SaveChangesAsync();
        lead.Code = $"LEAD{lead.Id:00000}";
        db.LeadAssignments.Add(new LeadAssignment { LeadId = lead.Id, AssignedTo = assignedId, AssignedBy = actorId, AssignedAt = now, CreatedAt = now, UpdatedAt = now });
        db.LeadActivities.Add(new LeadActivity { LeadId = lead.Id, UserId = actorId, ActivityType = "NOTE", Content = "Lead mới được tạo và phân công phụ trách.", Metadata = JsonSerializer.Serialize(new { assigned_user_id = assignedId }), CreatedAt = now, UpdatedAt = now });
        Audit.Add(db, actorId, "CREATE", "Lead", lead.Id, null, new { code = lead.Code, status = "NEW", assigned_user_id = assignedId }, http);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return lead.Id;
    }

    public async Task Transition(long leadId, TransitionLeadRequest request, long actorId, HttpContext http)
    {
        var target = Validation.Required(request.Status, "status", "Vui lòng chọn trạng thái.", 32).ToUpperInvariant();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var lead = await LockedLead(leadId);
        var current = await db.LeadStatuses.Where(x => x.Id == lead.StatusId).Select(x => x.Code).SingleAsync();
        if (!LeadTransitionPolicy.Allows(current, target))
            throw ApiValidationException.For("status", target == "WON" ? "Trạng thái WON chỉ được thiết lập qua quy trình chuyển đổi lead." : $"Không thể chuyển lead từ {current} sang {target}.");
        if (target == "LOST" && string.IsNullOrWhiteSpace(request.Reason)) throw ApiValidationException.For("reason", "Vui lòng nhập lý do khi đánh dấu lead thất bại.");
        var targetStatus = await db.LeadStatuses.SingleOrDefaultAsync(x => x.Code == target) ?? throw ApiValidationException.For("status", "Trạng thái không hợp lệ.");
        var now = DateTime.UtcNow;
        lead.StatusId = targetStatus.Id; lead.UpdatedAt = now;
        db.LeadActivities.Add(new LeadActivity { LeadId = leadId, UserId = actorId, ActivityType = "STATUS_CHANGE", Content = $"Chuyển trạng thái {current} → {target}" + (string.IsNullOrWhiteSpace(request.Reason) ? "" : $". Lý do: {request.Reason.Trim()}"), Metadata = JsonSerializer.Serialize(new { from = current, to = target, reason = request.Reason?.Trim() }), CreatedAt = now, UpdatedAt = now });
        Audit.Add(db, actorId, "STATUS_CHANGE", "Lead", leadId, new { status = current }, new { status = target, reason = request.Reason?.Trim() }, http);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    public async Task<long> BookTrial(long leadId, BookTrialRequest request, long actorId, HttpContext http)
    {
        if (request.ScheduledAt == default) throw ApiValidationException.For("scheduled_at", "Vui lòng chọn lịch học thử.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var lead = await LockedLead(leadId);
        var current = await db.LeadStatuses.Where(x => x.Id == lead.StatusId).Select(x => x.Code).SingleAsync();
        if (!new[] { "CONTACTED", "QUALIFIED", "TRIAL_COMPLETED", "CONSIDERING" }.Contains(current)) throw ApiValidationException.For("lead", $"Không thể đặt học thử khi lead ở trạng thái {current}.");
        if (!await db.Courses.AnyAsync(x => x.Id == request.CourseId && x.Status == "ACTIVE")) throw ApiValidationException.For("course_id", "Khóa học không hợp lệ.");
        if (request.ClassId is not null && !await db.Classes.AnyAsync(x => x.Id == request.ClassId && x.CourseId == request.CourseId && (x.Status == "PLANNED" || x.Status == "ACTIVE"))) throw ApiValidationException.For("class_id", "Lớp học không thuộc khóa học đã chọn hoặc không nhận học thử.");
        var now = DateTime.UtcNow;
        var trial = new TrialSession { LeadId = leadId, StudentId = request.StudentId, CourseId = request.CourseId, ClassId = request.ClassId, ScheduledAt = Utc(request.ScheduledAt)!.Value, AttendanceStatus = "SCHEDULED", Note = request.Note?.Trim(), StaffId = actorId, CreatedAt = now, UpdatedAt = now };
        db.TrialSessions.Add(trial);
        lead.StatusId = await db.LeadStatuses.Where(x => x.Code == "TRIAL_BOOKED").Select(x => x.Id).SingleAsync(); lead.UpdatedAt = now;
        await db.SaveChangesAsync();
        db.LeadActivities.Add(new LeadActivity { LeadId = leadId, UserId = actorId, ActivityType = "TRIAL", Content = $"Đã đặt lịch học thử lúc {trial.ScheduledAt:O}.", Metadata = JsonSerializer.Serialize(new { trial_session_id = trial.Id }), CreatedAt = now, UpdatedAt = now });
        db.Tasks.Add(new WorkTask { RelatedType = "Lead", RelatedId = leadId, AssignedTo = actorId, Title = "Xác nhận lịch học thử với phụ huynh", DueAt = trial.ScheduledAt.AddDays(-1), Status = "OPEN", Priority = "HIGH", CreatedAt = now, UpdatedAt = now });
        Audit.Add(db, actorId, "BOOK_TRIAL", "Lead", leadId, new { status = current }, new { status = "TRIAL_BOOKED", trial_session_id = trial.Id }, http);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return trial.Id;
    }

    public async Task<long> CompleteTrial(long leadId, CompleteTrialRequest request, long actorId, HttpContext http)
    {
        var result = Validation.Required(request.Result, "result", "Vui lòng chọn kết quả học thử.", 40).ToUpperInvariant();
        if (!new[] { "INTERESTED", "NEEDS_CONSIDERATION", "NOT_INTERESTED" }.Contains(result)) throw ApiValidationException.For("result", "Kết quả học thử không hợp lệ.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var lead = await LockedLead(leadId);
        var current = await db.LeadStatuses.Where(x => x.Id == lead.StatusId).Select(x => x.Code).SingleAsync();
        if (current != "TRIAL_BOOKED") throw ApiValidationException.For("lead", $"Không thể ghi nhận học thử khi lead ở trạng thái {current}.");
        var trial = await db.TrialSessions.FromSqlInterpolated($"SELECT * FROM trial_sessions WHERE lead_id = {leadId} AND attendance_status = 'SCHEDULED' ORDER BY scheduled_at DESC LIMIT 1 FOR UPDATE").SingleOrDefaultAsync()
            ?? throw ApiValidationException.For("trial", "Không tìm thấy lịch học thử đang chờ kết quả.");
        var now = DateTime.UtcNow;
        trial.AttendanceStatus = "ATTENDED"; trial.Result = result; trial.Note = request.Note?.Trim() ?? trial.Note; trial.UpdatedAt = now;
        lead.StatusId = await db.LeadStatuses.Where(x => x.Code == "TRIAL_COMPLETED").Select(x => x.Id).SingleAsync(); lead.UpdatedAt = now;
        db.LeadActivities.Add(new LeadActivity { LeadId = leadId, UserId = actorId, ActivityType = "TRIAL", Content = $"Đã tham gia học thử. Kết quả: {result}.", Metadata = JsonSerializer.Serialize(new { trial_session_id = trial.Id, attendance_status = "ATTENDED", result }), CreatedAt = now, UpdatedAt = now });
        Audit.Add(db, actorId, "COMPLETE_TRIAL", "TrialSession", trial.Id, new { attendance_status = "SCHEDULED" }, new { attendance_status = "ATTENDED", result }, http);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return trial.Id;
    }

    public async Task<object> Convert(long leadId, ConvertLeadRequest request, long actorId, HttpContext http)
    {
        var key = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu mã chống tạo trùng.", 120);
        var parentRequest = request.Parent ?? throw ApiValidationException.For("parent", "Vui lòng nhập thông tin phụ huynh.");
        var studentRequest = request.Student ?? throw ApiValidationException.For("student", "Vui lòng nhập thông tin học viên.");
        var parentName = Validation.Required(parentRequest.FullName, "parent.full_name", "Vui lòng nhập tên phụ huynh.", 190);
        var parentPhone = Validation.Required(parentRequest.Phone, "parent.phone", "Vui lòng nhập số điện thoại phụ huynh.", 40);
        var studentName = Validation.Required(studentRequest.FullName, "student.full_name", "Vui lòng nhập tên học viên.", 190);
        var relationship = Validation.Required(request.Relationship, "relationship", "Vui lòng chọn mối quan hệ.", 24).ToUpperInvariant();
        if (!new[] { "MOTHER", "FATHER", "GUARDIAN", "OTHER" }.Contains(relationship)) throw ApiValidationException.For("relationship", "Mối quan hệ không hợp lệ.");
        if (request.DiscountAmount < 0 || decimal.Truncate(request.DiscountAmount) != request.DiscountAmount) throw ApiValidationException.For("discount_amount", "Giảm giá phải là số nguyên không âm theo đơn vị đồng.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted);
        var lead = await LockedLead(leadId);
        var existing = await db.LeadConversions.SingleOrDefaultAsync(x => x.LeadId == leadId);
        if (existing is not null)
        {
            if (!string.Equals(existing.IdempotencyKey, key, StringComparison.Ordinal)) throw ApiValidationException.For("lead", "Lead đã được nhập học bằng một yêu cầu khác.");
            var existingResult = await ConversionResult(existing.Id);
            await transaction.CommitAsync();
            return existingResult;
        }
        if (await db.LeadConversions.AnyAsync(x => x.IdempotencyKey == key)) throw ApiValidationException.For("idempotency_key", "Mã chống trùng đã được dùng cho lead khác.");
        var current = await db.LeadStatuses.Where(x => x.Id == lead.StatusId).Select(x => x.Code).SingleAsync();
        if (current != "CONSIDERING") throw ApiValidationException.For("lead", $"Chỉ có thể nhập học lead ở trạng thái CONSIDERING, hiện tại là {current}.");
        var classRoom = await db.Classes.FromSqlInterpolated($"SELECT * FROM classes WHERE id = {request.ClassId} FOR UPDATE").SingleOrDefaultAsync() ?? throw new KeyNotFoundException();
        if (classRoom.Status is not ("PLANNED" or "ACTIVE")) throw ApiValidationException.For("class_id", "Lớp đã chọn không nhận ghi danh.");
        if (lead.InterestedCourseId is not null && lead.InterestedCourseId != classRoom.CourseId) throw ApiValidationException.For("class_id", "Lớp không thuộc khóa học lead đang quan tâm.");
        var enrolled = await db.Enrollments.CountAsync(x => x.ClassId == classRoom.Id && (x.Status == "PENDING" || x.Status == "ACTIVE"));
        if (enrolled >= classRoom.Capacity) throw ApiValidationException.For("class_id", "Lớp đã đủ sĩ số.");
        var course = await db.Courses.FindAsync(classRoom.CourseId) ?? throw new KeyNotFoundException();
        if (request.DiscountAmount > course.TuitionFee) throw ApiValidationException.For("discount_amount", "Giảm giá không được lớn hơn học phí.");
        var now = DateTime.UtcNow;
        var parent = new Parent { Code = TemporaryCode(), FullName = parentName, Phone = parentPhone, PhoneNormalized = Validation.Digits(parentPhone), Email = parentRequest.Email?.Trim(), Address = parentRequest.Address?.Trim(), CreatedAt = now, UpdatedAt = now };
        var student = new Student { Code = TemporaryCode(), FullName = studentName, DateOfBirth = studentRequest.DateOfBirth, Gender = studentRequest.Gender?.ToUpperInvariant(), SchoolName = studentRequest.SchoolName?.Trim(), SchoolGrade = studentRequest.SchoolGrade?.Trim(), Status = "ACTIVE", CreatedAt = now, UpdatedAt = now };
        db.AddRange(parent, student);
        await db.SaveChangesAsync();
        parent.Code = $"PH{parent.Id:00000}"; student.Code = $"HV{student.Id:00000}";
        db.ParentStudents.Add(new ParentStudent { ParentId = parent.Id, StudentId = student.Id, Relationship = relationship, IsPrimaryContact = true, CreatedAt = now, UpdatedAt = now });
        var enrollment = new Enrollment { StudentId = student.Id, ClassId = classRoom.Id, RegisteredBy = actorId, RegistrationDate = DateOnly.FromDateTime(now), OriginalFee = course.TuitionFee, DiscountAmount = request.DiscountAmount, FinalFee = course.TuitionFee - request.DiscountAmount, Status = "ACTIVE", CreatedAt = now, UpdatedAt = now };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();
        var invoice = new Invoice { ParentId = parent.Id, StudentId = student.Id, EnrollmentId = enrollment.Id, InvoiceCode = TemporaryCode(), TotalAmount = course.TuitionFee, DiscountAmount = request.DiscountAmount, FinalAmount = enrollment.FinalFee, PaidAmount = 0, RemainingAmount = enrollment.FinalFee, Status = enrollment.FinalFee == 0 ? "PAID" : "UNPAID", IssuedAt = now, DueAt = now.AddDays(7), CreatedAt = now, UpdatedAt = now };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();
        invoice.InvoiceCode = $"INV-{now.Year}-{invoice.Id:00000}";
        db.InvoiceItems.Add(new InvoiceItem { InvoiceId = invoice.Id, ItemType = "COURSE_FEE", ItemId = classRoom.Id, Description = $"Học phí {course.Name} - {classRoom.Name}", Quantity = 1, UnitPrice = course.TuitionFee, Amount = course.TuitionFee, CreatedAt = now, UpdatedAt = now });
        lead.StatusId = await db.LeadStatuses.Where(x => x.Code == "WON").Select(x => x.Id).SingleAsync(); lead.ConvertedParentId = parent.Id; lead.NextFollowUpAt = null; lead.UpdatedAt = now;
        var conversion = new LeadConversion { LeadId = leadId, IdempotencyKey = key, ParentId = parent.Id, StudentId = student.Id, EnrollmentId = enrollment.Id, InvoiceId = invoice.Id, ConvertedBy = actorId, ConvertedAt = now, CreatedAt = now, UpdatedAt = now };
        db.LeadConversions.Add(conversion);
        await db.SaveChangesAsync();
        db.LeadActivities.Add(new LeadActivity { LeadId = leadId, UserId = actorId, ActivityType = "STATUS_CHANGE", Content = $"Đã nhập học, tạo học viên {studentName} và hóa đơn {invoice.InvoiceCode}.", Metadata = JsonSerializer.Serialize(new { from = current, to = "WON", conversion_id = conversion.Id, enrollment_id = enrollment.Id, invoice_id = invoice.Id }), CreatedAt = now, UpdatedAt = now });
        Audit.Add(db, actorId, "CONVERT", "Lead", leadId, new { status = current }, new { status = "WON", parent_id = parent.Id, student_id = student.Id, enrollment_id = enrollment.Id, invoice_id = invoice.Id }, http);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return await ConversionResult(conversion.Id);
    }

    private async Task<Lead> LockedLead(long id) => await db.Leads.FromSqlInterpolated($"SELECT * FROM leads WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync() ?? throw new KeyNotFoundException();

    private async Task<object> ConversionResult(long conversionId) => await (
        from conversion in db.LeadConversions
        join invoice in db.Invoices on conversion.InvoiceId equals invoice.Id
        where conversion.Id == conversionId
        select new { conversion.Id, conversion.LeadId, conversion.ParentId, conversion.StudentId, conversion.EnrollmentId, conversion.InvoiceId, invoice.InvoiceCode, invoice.FinalAmount, invoice.RemainingAmount, invoice.Status }).SingleAsync();

    private static string TemporaryCode() => "TMP" + Guid.NewGuid().ToString("N")[..20];
    private static DateTime? Utc(DateTime? value) => value is null ? null : value.Value.Kind == DateTimeKind.Utc ? value : value.Value.ToUniversalTime();
}
