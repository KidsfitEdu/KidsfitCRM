using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;

namespace KidsfitCRM.Api.Features;

public sealed class LeadListItem
{
    public long Id { get; init; }
    public string Code { get; init; } = "";
    public string FullName { get; init; } = "";
    public string Phone { get; init; } = "";
    [JsonIgnore]
    public string PhoneNormalized { get; init; } = "";
    public string? Email { get; init; }
    public string? Note { get; init; }
    public DateTime? NextFollowUpAt { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public string StatusCode { get; init; } = "";
    public string StatusName { get; init; } = "";
    public string StatusColor { get; init; } = "";
    public string SourceCode { get; init; } = "";
    public string SourceName { get; init; } = "";
    public long? CourseId { get; init; }
    public string? CourseName { get; init; }
    public long? AssignedUserId { get; init; }
    public string? AssignedUserName { get; init; }
}

public static class ApiEndpoints
{
    public static IEndpointRouteBuilder MapKidsfitApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");
        api.MapPost("/login", AuthFeatures.Login).RequireRateLimiting("login");
        var secured = api.MapGroup("").RequireAuthorization();
        secured.MapGet("/me", AuthFeatures.Me);
        secured.MapPost("/logout", AuthFeatures.Logout);
        secured.MapGet("/catalogs", Catalogs).RequireAuthorization(policy => policy.RequireAssertion(context => context.User.HasClaim("permission", Permissions.LeadView) || context.User.HasClaim("permission", Permissions.CourseView)));
        secured.MapGet("/dashboard", Dashboard).RequireAuthorization(Permissions.DashboardView);
        secured.MapGet("/leads", Leads).RequireAuthorization(Permissions.LeadView);
        secured.MapGet("/leads/{id:long}", Lead).RequireAuthorization(Permissions.LeadView);
        secured.MapPost("/leads", async (CreateLeadRequest request, HttpContext http, LeadActions actions, KidsfitDbContext db) =>
        {
            var id = await actions.Create(request, http.UserId(), http);
            return Results.Created($"/api/leads/{id}", new { data = await LeadQuery(db).SingleAsync(x => x.Id == id) });
        }).RequireAuthorization(Permissions.LeadCreate);
        secured.MapPatch("/leads/{id:long}/status", async (long id, TransitionLeadRequest request, HttpContext http, LeadActions actions, KidsfitDbContext db) =>
        {
            await actions.Transition(id, request, http.UserId(), http);
            return Results.Ok(new { data = await LeadQuery(db).SingleAsync(x => x.Id == id) });
        }).RequireAuthorization(Permissions.LeadUpdate);
        secured.MapPost("/leads/{id:long}/trial", async (long id, BookTrialRequest request, HttpContext http, LeadActions actions) => Results.Created($"/api/leads/{id}", new { trial_session_id = await actions.BookTrial(id, request, http.UserId(), http) })).RequireAuthorization(Permissions.LeadUpdate);
        secured.MapPost("/leads/{id:long}/trial/complete", async (long id, CompleteTrialRequest request, HttpContext http, LeadActions actions) => Results.Ok(new { trial_session_id = await actions.CompleteTrial(id, request, http.UserId(), http) })).RequireAuthorization(Permissions.LeadUpdate);
        secured.MapPost("/leads/{id:long}/convert", async (long id, ConvertLeadRequest request, HttpContext http, LeadActions actions) => Results.Created($"/api/leads/{id}", new { data = await actions.Convert(id, request, http.UserId(), http) })).RequireAuthorization(Permissions.LeadUpdate);
        secured.MapGet("/students", Students).RequireAuthorization(Permissions.StudentView);
        secured.MapGet("/classes", Classes).RequireAuthorization(Permissions.CourseView);
        secured.MapGet("/invoices", Invoices).RequireAuthorization(Permissions.PaymentView);
        secured.MapPost("/invoices/{id:long}/payments", async (long id, RecordPaymentRequest request, HttpContext http, BillingActions actions) => Results.Created($"/api/invoices/{id}", new { data = await actions.RecordPayment(id, request, http.UserId(), http) })).RequireAuthorization(Permissions.PaymentCreate);
        secured.MapPatch("/tasks/{id:long}/complete", async (long id, HttpContext http, BillingActions actions) => { await actions.CompleteTask(id, http.UserId(), http); return Results.Ok(new { message = "Đã hoàn thành công việc." }); }).RequireAuthorization(Permissions.DashboardView);
        secured.MapChannelSalesApi();
        return app;
    }

    private static async Task<IResult> Catalogs(KidsfitDbContext db) => Results.Ok(new
    {
        lead_statuses = await db.LeadStatuses.OrderBy(x => x.SortOrder).Select(x => new { x.Id, x.Code, x.Name, x.Color, x.IsTerminal }).ToListAsync(),
        lead_sources = await db.LeadSources.Where(x => x.IsActive).OrderBy(x => x.Name).Select(x => new { x.Id, x.Code, x.Name, x.Color }).ToListAsync(),
        courses = await db.Courses.Where(x => x.Status == "ACTIVE").OrderBy(x => x.Name).Select(x => new { x.Id, x.Code, x.Name, x.TuitionFee }).ToListAsync(),
        classes = await (from room in db.Classes join course in db.Courses on room.CourseId equals course.Id where room.Status == "PLANNED" || room.Status == "ACTIVE" orderby room.Name select new { room.Id, room.CourseId, room.Code, room.Name, room.Capacity, course_name = course.Name }).ToListAsync(),
        users = await db.Users.Where(x => x.Status == "ACTIVE").OrderBy(x => x.Name).Select(x => new { x.Id, x.Code, x.Name }).ToListAsync(),
    });

    private static async Task<IResult> Leads(KidsfitDbContext db, string? status, string? source, string? search, int page = 1, int per_page = 20)
    {
        page = Math.Max(page, 1); per_page = Math.Clamp(per_page, 1, 100);
        var query = LeadQuery(db);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.StatusCode == status);
        if (!string.IsNullOrWhiteSpace(source)) query = query.Where(x => x.SourceCode == source);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var digits = Validation.Digits(term);
            query = query.Where(x => x.FullName.Contains(term) || x.Code.Contains(term) || (digits != "" && x.PhoneNormalized.Contains(digits)));
        }
        var total = await query.CountAsync();
        var data = await query.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * per_page).Take(per_page).ToListAsync();
        return Results.Ok(new { data, meta = new { current_page = page, last_page = Math.Max(1, (int)Math.Ceiling(total / (double)per_page)), per_page, total } });
    }

    private static async Task<IResult> Lead(long id, KidsfitDbContext db)
    {
        var lead = await LeadQuery(db).SingleOrDefaultAsync(x => x.Id == id) ?? throw new KeyNotFoundException();
        var activities = await (from activity in db.LeadActivities join user in db.Users on activity.UserId equals (long?)user.Id into users from user in users.DefaultIfEmpty() where activity.LeadId == id orderby activity.CreatedAt descending select new { activity.Id, activity.ActivityType, activity.Content, activity.Metadata, activity.CreatedAt, user_name = user == null ? null : user.Name }).ToListAsync();
        return Results.Ok(new { data = lead, activities });
    }

    private static IQueryable<LeadListItem> LeadQuery(KidsfitDbContext db) =>
        from lead in db.Leads
        join status in db.LeadStatuses on lead.StatusId equals status.Id
        join source in db.LeadSources on lead.SourceId equals source.Id
        join course in db.Courses on lead.InterestedCourseId equals (long?)course.Id into courses
        from course in courses.DefaultIfEmpty()
        join user in db.Users on lead.AssignedUserId equals (long?)user.Id into users
        from user in users.DefaultIfEmpty()
        select new LeadListItem
        {
            Id = lead.Id, Code = lead.Code, FullName = lead.FullName, Phone = lead.Phone, PhoneNormalized = lead.PhoneNormalized, Email = lead.Email,
            Note = lead.Note, NextFollowUpAt = lead.NextFollowUpAt, CreatedAt = lead.CreatedAt, UpdatedAt = lead.UpdatedAt,
            StatusCode = status.Code, StatusName = status.Name, StatusColor = status.Color,
            SourceCode = source.Code, SourceName = source.Name,
            CourseId = course == null ? null : course.Id, CourseName = course == null ? null : course.Name,
            AssignedUserId = user == null ? null : user.Id, AssignedUserName = user == null ? null : user.Name,
        };

    private static async Task<IResult> Dashboard(HttpContext http, KidsfitDbContext db)
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var tomorrow = today.AddDays(1);
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var userId = http.UserId();
        var pipeline = await (from status in db.LeadStatuses join lead in db.Leads on status.Id equals lead.StatusId into leads orderby status.SortOrder select new { status.Code, status.Name, status.Color, status.SortOrder, total = leads.Count() }).ToListAsync();
        var tasks = await db.Tasks.Where(x => x.AssignedTo == userId && x.Status == "OPEN").OrderBy(x => x.Priority == "HIGH" ? 0 : x.Priority == "MEDIUM" ? 1 : 2).ThenBy(x => x.DueAt).Take(6).Select(x => new { x.Id, x.Title, x.DueAt, x.Priority, x.RelatedType, x.RelatedId }).ToListAsync();
        var recentLeads = await LeadQuery(db).OrderByDescending(x => x.CreatedAt).Take(6).ToListAsync();
        var revenueRows = await db.Payments.Where(x => x.Status == "COMPLETED" && x.PaymentDate >= monthStart.AddMonths(-5)).GroupBy(x => new { x.PaymentDate.Year, x.PaymentDate.Month }).Select(group => new { group.Key.Year, group.Key.Month, Total = group.Sum(x => x.Amount) }).OrderBy(x => x.Year).ThenBy(x => x.Month).ToListAsync();
        return Results.Ok(new
        {
            metrics = new
            {
                new_leads = await db.Leads.CountAsync(x => x.CreatedAt >= weekStart),
                follow_ups_due = await db.Tasks.CountAsync(x => x.AssignedTo == userId && x.Status == "OPEN" && x.DueAt >= today && x.DueAt < tomorrow),
                overdue_follow_ups = await db.Tasks.CountAsync(x => x.AssignedTo == userId && x.Status == "OPEN" && x.DueAt < today),
                trials_today = await db.TrialSessions.CountAsync(x => x.ScheduledAt >= today && x.ScheduledAt < tomorrow),
                revenue_month = await db.Payments.Where(x => x.Status == "COMPLETED" && x.PaymentDate >= monthStart).SumAsync(x => x.Amount),
                outstanding = await db.Invoices.Where(x => x.Status == "UNPAID" || x.Status == "PARTIAL" || x.Status == "OVERDUE").SumAsync(x => x.RemainingAmount),
                active_students = await db.Students.CountAsync(x => x.Status == "ACTIVE"),
                active_classes = await db.Classes.CountAsync(x => x.Status == "ACTIVE"),
            },
            pipeline,
            tasks,
            recent_leads = recentLeads,
            revenue = revenueRows.Select(x => new { period = $"{x.Year:0000}-{x.Month:00}", total = x.Total }),
        });
    }

    private static async Task<IResult> Students(KidsfitDbContext db)
    {
        var rows = await (from student in db.Students
                          join link in db.ParentStudents on student.Id equals link.StudentId into links
                          from link in links.Where(x => x.IsPrimaryContact).DefaultIfEmpty()
                          join parent in db.Parents on link.ParentId equals parent.Id into parents
                          from parent in parents.DefaultIfEmpty()
                          join enrollment in db.Enrollments.Where(x => x.Status == "ACTIVE") on student.Id equals enrollment.StudentId into enrollments
                          from enrollment in enrollments.DefaultIfEmpty()
                          join room in db.Classes on enrollment.ClassId equals room.Id into rooms
                          from room in rooms.DefaultIfEmpty()
                          orderby student.FullName
                          select new { student.Id, student.Code, student.FullName, student.DateOfBirth, student.SchoolName, student.SchoolGrade, student.Status, parent_name = parent == null ? null : parent.FullName, parent_phone = parent == null ? null : parent.Phone, class_name = room == null ? null : room.Name }).ToListAsync();
        return Results.Ok(new { data = rows.DistinctBy(x => x.Id) });
    }

    private static async Task<IResult> Classes(KidsfitDbContext db)
    {
        var rows = await (from room in db.Classes join course in db.Courses on room.CourseId equals course.Id join teacher in db.Users on room.TeacherId equals (long?)teacher.Id into teachers from teacher in teachers.DefaultIfEmpty() orderby room.StartDate select new { room.Id, room.CourseId, room.Code, room.Name, room.StartDate, room.EndDate, room.Capacity, room.Status, course_name = course.Name, teacher_name = teacher == null ? null : teacher.Name, enrolled_count = db.Enrollments.Count(x => x.ClassId == room.Id && (x.Status == "PENDING" || x.Status == "ACTIVE")) }).ToListAsync();
        return Results.Ok(new { data = rows });
    }

    private static async Task<IResult> Invoices(KidsfitDbContext db)
    {
        var rows = await (from invoice in db.Invoices join parent in db.Parents on invoice.ParentId equals parent.Id join student in db.Students on invoice.StudentId equals student.Id orderby invoice.IssuedAt descending select new { invoice.Id, invoice.InvoiceCode, invoice.FinalAmount, invoice.PaidAmount, invoice.RemainingAmount, invoice.Status, invoice.IssuedAt, invoice.DueAt, parent_name = parent.FullName, student_name = student.FullName }).ToListAsync();
        return Results.Ok(new { data = rows });
    }
}
