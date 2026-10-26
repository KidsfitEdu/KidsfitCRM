using System.Text;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

public sealed partial class KidsfitDbContext(DbContextOptions<KidsfitDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<PermissionRole> PermissionRoles => Set<PermissionRole>();
    public DbSet<LeadSource> LeadSources => Set<LeadSource>();
    public DbSet<LeadStatus> LeadStatuses => Set<LeadStatus>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<ClassRoom> Classes => Set<ClassRoom>();
    public DbSet<ClassSchedule> ClassSchedules => Set<ClassSchedule>();
    public DbSet<Parent> Parents => Set<Parent>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<ParentStudent> ParentStudents => Set<ParentStudent>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<LeadAssignment> LeadAssignments => Set<LeadAssignment>();
    public DbSet<LeadNote> LeadNotes => Set<LeadNote>();
    public DbSet<LeadActivity> LeadActivities => Set<LeadActivity>();
    public DbSet<TrialSession> TrialSessions => Set<TrialSession>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<WorkTask> Tasks => Set<WorkTask>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<LeadConversion> LeadConversions => Set<LeadConversion>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<OrganizationMembership> OrganizationMemberships => Set<OrganizationMembership>();
    public DbSet<ChannelCustomer> ChannelCustomers => Set<ChannelCustomer>();
    public DbSet<CustomerIdentifier> CustomerIdentifiers => Set<CustomerIdentifier>();
    public DbSet<ApproachRegistration> ApproachRegistrations => Set<ApproachRegistration>();
    public DbSet<CustomerActivity> CustomerActivities => Set<CustomerActivity>();
    public DbSet<CheckeeProductPackage> CheckeeProductPackages => Set<CheckeeProductPackage>();
    public DbSet<SalesContract> SalesContracts => Set<SalesContract>();
    public DbSet<SalesContractItem> SalesContractItems => Set<SalesContractItem>();
    public DbSet<CustomerProtection> CustomerProtections => Set<CustomerProtection>();
    public DbSet<RevenueSchedule> RevenueSchedules => Set<RevenueSchedule>();
    public DbSet<RevenueReceipt> RevenueReceipts => Set<RevenueReceipt>();
    public DbSet<CommissionPolicyVersion> CommissionPolicyVersions => Set<CommissionPolicyVersion>();
    public DbSet<CommissionLedgerEntry> CommissionLedgerEntries => Set<CommissionLedgerEntry>();
    public DbSet<Payout> Payouts => Set<Payout>();
    public DbSet<PayoutItem> PayoutItems => Set<PayoutItem>();
    public DbSet<PayoutEvent> PayoutEvents => Set<PayoutEvent>();
    public DbSet<ReconciliationCase> ReconciliationCases => Set<ReconciliationCase>();
    public DbSet<ReconciliationEvent> ReconciliationEvents => Set<ReconciliationEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.UseCollation("utf8mb4_0900_ai_ci");

        modelBuilder.Entity<UserRole>().ToTable("role_user").HasKey(x => new { x.RoleId, x.UserId });
        modelBuilder.Entity<PermissionRole>().ToTable("permission_role").HasKey(x => new { x.PermissionId, x.RoleId });
        modelBuilder.Entity<ParentStudent>().ToTable("parent_student");
        modelBuilder.Entity<ClassRoom>().ToTable("classes");
        modelBuilder.Entity<WorkTask>().ToTable("tasks");

        UniqueCode<User>(modelBuilder, 24);
        UniqueCode<Role>(modelBuilder, 32);
        UniqueCode<Permission>(modelBuilder, 80);
        UniqueCode<LeadSource>(modelBuilder, 32);
        UniqueCode<LeadStatus>(modelBuilder, 32);
        UniqueCode<Course>(modelBuilder, 40);
        UniqueCode<ClassRoom>(modelBuilder, 40);
        UniqueCode<Parent>(modelBuilder, 24);
        UniqueCode<Student>(modelBuilder, 24);
        UniqueCode<Lead>(modelBuilder, 24);

        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<User>().Property(x => x.Email).HasMaxLength(190);
        modelBuilder.Entity<User>().Property(x => x.Password).HasMaxLength(255);
        modelBuilder.Entity<User>().Property(x => x.Name).HasMaxLength(190);
        modelBuilder.Entity<User>().Property(x => x.Phone).HasMaxLength(40);
        modelBuilder.Entity<User>().Property(x => x.Status).HasMaxLength(24);
        modelBuilder.Entity<Role>().Property(x => x.Name).HasMaxLength(120);
        modelBuilder.Entity<Permission>().Property(x => x.Name).HasMaxLength(160);
        modelBuilder.Entity<Permission>().Property(x => x.Group).HasMaxLength(80);
        modelBuilder.Entity<LeadSource>().Property(x => x.Name).HasMaxLength(120);
        modelBuilder.Entity<LeadSource>().Property(x => x.Color).HasMaxLength(16);
        modelBuilder.Entity<LeadStatus>().Property(x => x.Name).HasMaxLength(120);
        modelBuilder.Entity<LeadStatus>().Property(x => x.Color).HasMaxLength(16);
        modelBuilder.Entity<Course>().Property(x => x.Name).HasMaxLength(190);
        modelBuilder.Entity<Course>().Property(x => x.Status).HasMaxLength(24);
        modelBuilder.Entity<ClassRoom>().Property(x => x.Name).HasMaxLength(190);
        modelBuilder.Entity<ClassRoom>().Property(x => x.Status).HasMaxLength(24);
        modelBuilder.Entity<Enrollment>().Property(x => x.Status).HasMaxLength(24);
        modelBuilder.Entity<Invoice>().Property(x => x.InvoiceCode).HasMaxLength(40);
        modelBuilder.Entity<Invoice>().Property(x => x.Status).HasMaxLength(24);
        modelBuilder.Entity<Payment>().Property(x => x.ReferenceCode).HasMaxLength(48);
        modelBuilder.Entity<Payment>().Property(x => x.PaymentMethod).HasMaxLength(32);
        modelBuilder.Entity<Payment>().Property(x => x.Status).HasMaxLength(24);
        modelBuilder.Entity<Lead>().Property(x => x.FullName).HasMaxLength(190);
        modelBuilder.Entity<Lead>().Property(x => x.Phone).HasMaxLength(40);
        modelBuilder.Entity<Lead>().Property(x => x.PhoneNormalized).HasMaxLength(24);
        modelBuilder.Entity<Parent>().Property(x => x.FullName).HasMaxLength(190);
        modelBuilder.Entity<Parent>().Property(x => x.Phone).HasMaxLength(40);
        modelBuilder.Entity<Parent>().Property(x => x.PhoneNormalized).HasMaxLength(24);
        modelBuilder.Entity<Student>().Property(x => x.FullName).HasMaxLength(190);
        modelBuilder.Entity<ParentStudent>().Property(x => x.Relationship).HasMaxLength(24);
        modelBuilder.Entity<TrialSession>().Property(x => x.AttendanceStatus).HasMaxLength(24);
        modelBuilder.Entity<TrialSession>().Property(x => x.Result).HasMaxLength(40);
        modelBuilder.Entity<WorkTask>().Property(x => x.RelatedType).HasMaxLength(40);
        modelBuilder.Entity<WorkTask>().Property(x => x.Status).HasMaxLength(24);
        modelBuilder.Entity<WorkTask>().Property(x => x.Priority).HasMaxLength(16);
        modelBuilder.Entity<Student>().Property(x => x.DateOfBirth)
            .HasConversion(
                value => value.HasValue ? value.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                value => value.HasValue ? DateOnly.FromDateTime(value.Value) : (DateOnly?)null)
            .HasColumnType("date");
        modelBuilder.Entity<ClassRoom>().Property(x => x.StartDate)
            .HasConversion(value => value.ToDateTime(TimeOnly.MinValue), value => DateOnly.FromDateTime(value))
            .HasColumnType("date");
        modelBuilder.Entity<ClassRoom>().Property(x => x.EndDate)
            .HasConversion(
                value => value.HasValue ? value.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                value => value.HasValue ? DateOnly.FromDateTime(value.Value) : (DateOnly?)null)
            .HasColumnType("date");
        modelBuilder.Entity<Enrollment>().Property(x => x.RegistrationDate)
            .HasConversion(value => value.ToDateTime(TimeOnly.MinValue), value => DateOnly.FromDateTime(value))
            .HasColumnType("date");
        modelBuilder.Entity<Lead>().HasIndex(x => x.PhoneNormalized);
        modelBuilder.Entity<Lead>().HasIndex(x => new { x.StatusId, x.AssignedUserId, x.NextFollowUpAt });
        modelBuilder.Entity<Parent>().HasIndex(x => x.PhoneNormalized);
        modelBuilder.Entity<ClassRoom>().HasIndex(x => new { x.CourseId, x.Status });
        modelBuilder.Entity<Enrollment>().HasIndex(x => new { x.ClassId, x.Status });
        modelBuilder.Entity<Invoice>().HasIndex(x => x.InvoiceCode).IsUnique();
        modelBuilder.Entity<Invoice>().HasIndex(x => new { x.Status, x.DueAt });
        modelBuilder.Entity<Payment>().HasIndex(x => x.ReferenceCode).IsUnique();
        modelBuilder.Entity<Payment>().HasIndex(x => x.IdempotencyKey).IsUnique();
        modelBuilder.Entity<Payment>().Property(x => x.IdempotencyKey).HasMaxLength(120).UseCollation("utf8mb4_bin");
        modelBuilder.Entity<LeadConversion>().HasIndex(x => x.LeadId).IsUnique();
        modelBuilder.Entity<LeadConversion>().HasIndex(x => x.IdempotencyKey).IsUnique();
        modelBuilder.Entity<LeadConversion>().Property(x => x.IdempotencyKey).HasMaxLength(120).UseCollation("utf8mb4_bin");
        modelBuilder.Entity<ParentStudent>().HasIndex(x => new { x.ParentId, x.StudentId }).IsUnique();

        Money<Course>(modelBuilder, x => x.TuitionFee);
        Money<Enrollment>(modelBuilder, x => x.OriginalFee);
        Money<Enrollment>(modelBuilder, x => x.DiscountAmount);
        Money<Enrollment>(modelBuilder, x => x.FinalFee);
        Money<Invoice>(modelBuilder, x => x.TotalAmount);
        Money<Invoice>(modelBuilder, x => x.DiscountAmount);
        Money<Invoice>(modelBuilder, x => x.FinalAmount);
        Money<Invoice>(modelBuilder, x => x.PaidAmount);
        Money<Invoice>(modelBuilder, x => x.RemainingAmount);
        Money<InvoiceItem>(modelBuilder, x => x.UnitPrice);
        Money<InvoiceItem>(modelBuilder, x => x.Amount);
        Money<Payment>(modelBuilder, x => x.Amount);
        modelBuilder.Entity<InvoiceItem>().Property(x => x.Quantity).HasPrecision(12, 2);

        modelBuilder.Entity<LeadActivity>().Property(x => x.Metadata).HasColumnType("json");
        modelBuilder.Entity<Notification>().Property(x => x.Data).HasColumnType("json");
        modelBuilder.Entity<AuditLog>().Property(x => x.OldValues).HasColumnType("json");
        modelBuilder.Entity<AuditLog>().Property(x => x.NewValues).HasColumnType("json");

        ConfigureChannelSales(modelBuilder);
        ConfigureSchools(modelBuilder);
        ConfigureSchoolOperations(modelBuilder);

        ConfigureForeignKeys(modelBuilder);

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            entity.SetTableName(ToSnakeCase(entity.GetTableName() ?? entity.ClrType.Name));
            foreach (var property in entity.GetProperties()) property.SetColumnName(ToSnakeCase(property.Name));
        }
    }

    private static void ConfigureChannelSales(ModelBuilder b)
    {
        UniqueCode<Organization>(b, 40);
        UniqueCode<ChannelCustomer>(b, 32);
        UniqueCode<CheckeeProductPackage>(b, 40);
        UniqueCode<CommissionPolicyVersion>(b, 48);
        UniqueCode<Payout>(b, 48);

        b.Entity<Organization>().Property(x => x.Name).HasMaxLength(190);
        b.Entity<Organization>().Property(x => x.OrganizationType).HasMaxLength(24);
        b.Entity<Organization>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<Organization>().Property(x => x.CommissionRateCeiling).HasPrecision(9, 4);
        b.Entity<OrganizationMembership>().HasIndex(x => new { x.OrganizationId, x.UserId }).IsUnique();
        b.Entity<OrganizationMembership>().HasIndex(x => new { x.UserId, x.Status });
        b.Entity<OrganizationMembership>().Property(x => x.MembershipType).HasMaxLength(32);
        b.Entity<OrganizationMembership>().Property(x => x.Status).HasMaxLength(24);

        b.Entity<ChannelCustomer>().Property(x => x.CustomerType).HasMaxLength(24);
        b.Entity<ChannelCustomer>().Property(x => x.DisplayName).HasMaxLength(500);
        b.Entity<ChannelCustomer>().Property(x => x.LegalName).HasMaxLength(190);
        b.Entity<ChannelCustomer>().Property(x => x.TaxCode).HasMaxLength(32);
        b.Entity<ChannelCustomer>().Property(x => x.Phone).HasMaxLength(40);
        b.Entity<ChannelCustomer>().Property(x => x.PhoneNormalized).HasMaxLength(24);
        b.Entity<ChannelCustomer>().Property(x => x.Email).HasMaxLength(190);
        b.Entity<ChannelCustomer>().Property(x => x.Website).HasMaxLength(190);
        b.Entity<ChannelCustomer>().Property(x => x.CheckeeCustomerCode).HasMaxLength(64);
        b.Entity<ChannelCustomer>().Property(x => x.Province).HasMaxLength(100);
        b.Entity<ChannelCustomer>().Property(x => x.District).HasMaxLength(100);
        b.Entity<ChannelCustomer>().Property(x => x.ContactName).HasMaxLength(500);
        b.Entity<ChannelCustomer>().Property(x => x.ContactPosition).HasMaxLength(120);
        b.Entity<ChannelCustomer>().Property(x => x.Source).HasMaxLength(80);
        b.Entity<ChannelCustomer>().Property(x => x.LifecycleStatus).HasMaxLength(24);
        b.Entity<ChannelCustomer>().Property(x => x.VerificationStatus).HasMaxLength(24);
        b.Entity<ChannelCustomer>().HasIndex(x => new { x.OrganizationId, x.LifecycleStatus });
        b.Entity<ChannelCustomer>().HasIndex(x => x.PhoneNormalized);

        b.Entity<CustomerIdentifier>().Property(x => x.IdentifierType).HasMaxLength(32);
        b.Entity<CustomerIdentifier>().Property(x => x.NormalizedValue).HasMaxLength(190).UseCollation("utf8mb4_bin");
        b.Entity<CustomerIdentifier>().Property(x => x.DisplayValue).HasMaxLength(190);
        b.Entity<CustomerIdentifier>().HasIndex(x => new { x.IdentifierType, x.NormalizedValue }).IsUnique();

        b.Entity<ApproachRegistration>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<ApproachRegistration>().Property(x => x.Source).HasMaxLength(80);
        b.Entity<ApproachRegistration>().Property(x => x.IdempotencyKey).HasMaxLength(120).UseCollation("utf8mb4_bin");
        b.Entity<ApproachRegistration>().HasIndex(x => x.IdempotencyKey).IsUnique();
        b.Entity<ApproachRegistration>().Property(x => x.RequestFingerprint).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<ApproachRegistration>().HasIndex(x => new { x.CustomerId, x.Status, x.ProtectedUntil });
        b.Entity<ApproachRegistration>().HasIndex(x => new { x.OwnerUserId, x.Status, x.ProtectedUntil });

        b.Entity<CustomerActivity>().Property(x => x.ActivityType).HasMaxLength(32);
        b.Entity<CustomerActivity>().HasIndex(x => new { x.CustomerId, x.CreatedAt });

        b.Entity<CheckeeProductPackage>().Property(x => x.Name).HasMaxLength(190);
        b.Entity<CheckeeProductPackage>().Property(x => x.Status).HasMaxLength(24);
        Money<CheckeeProductPackage>(b, x => x.ListPrice);

        b.Entity<SalesContract>().Property(x => x.ContractCode).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<SalesContract>().Property(x => x.OwnerPersonnelType).HasMaxLength(32).UseCollation("utf8mb4_bin");
        b.Entity<SalesContract>().Property(x => x.Currency).HasMaxLength(3);
        b.Entity<SalesContract>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<SalesContract>().Property(x => x.EvidenceReference).HasMaxLength(500);
        b.Entity<SalesContract>().Property(x => x.IdempotencyKey).HasMaxLength(120).UseCollation("utf8mb4_bin");
        b.Entity<SalesContract>().HasIndex(x => x.ContractCode).IsUnique();
        b.Entity<SalesContract>().HasIndex(x => x.IdempotencyKey).IsUnique();
        b.Entity<SalesContract>().Property(x => x.RequestFingerprint).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<SalesContract>().HasIndex(x => new { x.CustomerId, x.Status, x.ProtectionUntil });
        Money<SalesContract>(b, x => x.TotalValue);
        DateOnlyProperty(b.Entity<SalesContract>().Property(x => x.SignedOn));
        DateOnlyProperty(b.Entity<SalesContract>().Property(x => x.EffectiveOn));

        b.Entity<SalesContractItem>().Property(x => x.Description).HasMaxLength(255);
        b.Entity<SalesContractItem>().Property(x => x.Quantity).HasPrecision(12, 2);
        Money<SalesContractItem>(b, x => x.UnitPrice);
        Money<SalesContractItem>(b, x => x.Amount);

        b.Entity<CustomerProtection>().Property(x => x.SourceType).HasMaxLength(24);
        b.Entity<CustomerProtection>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<CustomerProtection>().HasIndex(x => new { x.CustomerId, x.Status, x.EffectiveUntil });
        b.Entity<CustomerProtection>().HasIndex(x => new { x.OwnerUserId, x.Status, x.EffectiveUntil });

        Money<RevenueSchedule>(b, x => x.AmountDue);
        Money<RevenueSchedule>(b, x => x.AmountReceived);
        b.Entity<RevenueSchedule>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<RevenueSchedule>().HasIndex(x => new { x.ContractId, x.Status, x.DueOn });
        DateOnlyProperty(b.Entity<RevenueSchedule>().Property(x => x.DueOn));

        Money<RevenueReceipt>(b, x => x.Amount);
        b.Entity<RevenueReceipt>().Property(x => x.ReferenceCode).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<RevenueReceipt>().Property(x => x.PaymentMethod).HasMaxLength(32);
        b.Entity<RevenueReceipt>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<RevenueReceipt>().Property(x => x.IdempotencyKey).HasMaxLength(120).UseCollation("utf8mb4_bin");
        b.Entity<RevenueReceipt>().HasIndex(x => x.ReferenceCode).IsUnique();
        b.Entity<RevenueReceipt>().HasIndex(x => x.IdempotencyKey).IsUnique();
        b.Entity<RevenueReceipt>().Property(x => x.RequestFingerprint).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<RevenueReceipt>().HasIndex(x => new { x.ContractId, x.ReceivedAt });

        b.Entity<CommissionPolicyVersion>().Property(x => x.Name).HasMaxLength(190);
        b.Entity<CommissionPolicyVersion>().Property(x => x.PersonnelType).HasMaxLength(32).UseCollation("utf8mb4_bin");
        b.Entity<CommissionPolicyVersion>().HasIndex(x => new { x.OrganizationId, x.PersonnelType, x.Status, x.EffectiveFrom });
        b.Entity<CommissionPolicyVersion>().Property(x => x.RatePercent).HasPrecision(9, 4);
        b.Entity<CommissionPolicyVersion>().Property(x => x.Status).HasMaxLength(24);
        DateOnlyProperty(b.Entity<CommissionPolicyVersion>().Property(x => x.EffectiveFrom));
        DateOnlyProperty(b.Entity<CommissionPolicyVersion>().Property(x => x.EffectiveUntil));
        b.Entity<CommissionPolicyVersion>().HasIndex(x => new { x.OrganizationId, x.Status, x.EffectiveFrom });

        b.Entity<CommissionLedgerEntry>().Property(x => x.EntryType).HasMaxLength(24);
        b.Entity<CommissionLedgerEntry>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<CommissionLedgerEntry>().Property(x => x.Period).HasMaxLength(7);
        b.Entity<CommissionLedgerEntry>().Property(x => x.Reason).HasMaxLength(1000);
        b.Entity<CommissionLedgerEntry>().Property(x => x.IdempotencyKey).HasMaxLength(120).UseCollation("utf8mb4_bin");
        b.Entity<CommissionLedgerEntry>().Property(x => x.RequestFingerprint).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<CommissionLedgerEntry>().HasIndex(x => x.IdempotencyKey).IsUnique();
        b.Entity<CommissionLedgerEntry>().Property(x => x.RatePercent).HasPrecision(9, 4);
        Money<CommissionLedgerEntry>(b, x => x.CalculationBase);
        Money<CommissionLedgerEntry>(b, x => x.Amount);
        b.Entity<CommissionLedgerEntry>().HasIndex(x => x.RevenueReceiptId).IsUnique();
        b.Entity<CommissionLedgerEntry>().HasIndex(x => new { x.BeneficiaryUserId, x.Period, x.Status });

        b.Entity<Payout>().Property(x => x.Period).HasMaxLength(7);
        b.Entity<Payout>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<Payout>().Property(x => x.IdempotencyKey).HasMaxLength(120).UseCollation("utf8mb4_bin");
        b.Entity<Payout>().Property(x => x.RequestFingerprint).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<Payout>().Property(x => x.PaymentReference).HasMaxLength(120).UseCollation("utf8mb4_bin");
        b.Entity<Payout>().Property(x => x.WithholdingReason).HasMaxLength(1000);
        b.Entity<Payout>().HasIndex(x => x.IdempotencyKey).IsUnique();
        b.Entity<Payout>().HasIndex(x => x.PaymentReference).IsUnique();
        b.Entity<PayoutEvent>().Property(x => x.EventType).HasMaxLength(24);
        b.Entity<PayoutEvent>().Property(x => x.Reason).HasMaxLength(1000);
        b.Entity<PayoutEvent>().HasIndex(x => new { x.PayoutId, x.CreatedAt });
        Money<Payout>(b, x => x.GrossAmount);
        Money<Payout>(b, x => x.WithholdingAmount);
        Money<Payout>(b, x => x.NetAmount);
        b.Entity<Payout>().HasIndex(x => new { x.OrganizationId, x.Period });
        Money<PayoutItem>(b, x => x.Amount);
        b.Entity<PayoutItem>().HasIndex(x => x.CommissionLedgerEntryId).IsUnique();

        b.Entity<ReconciliationCase>().Property(x => x.Status).HasMaxLength(24);
        b.Entity<ReconciliationCase>().HasIndex(x => x.ContractId).IsUnique();
        b.Entity<ReconciliationCase>().HasIndex(x => new { x.CheckeeOrganizationId, x.Status });
        b.Entity<ReconciliationEvent>().Property(x => x.EventType).HasMaxLength(24);
        b.Entity<ReconciliationEvent>().HasIndex(x => new { x.ReconciliationCaseId, x.CreatedAt });
    }

    private static void ConfigureForeignKeys(ModelBuilder b)
    {
        void Restrict<TEntity, TPrincipal>(System.Linq.Expressions.Expression<Func<TEntity, object?>> foreignKey)
            where TEntity : class where TPrincipal : class =>
            b.Entity<TEntity>().HasOne<TPrincipal>().WithMany().HasForeignKey(foreignKey).OnDelete(DeleteBehavior.Restrict);

        Restrict<UserRole, User>(x => x.UserId); Restrict<UserRole, Role>(x => x.RoleId);
        Restrict<PermissionRole, Permission>(x => x.PermissionId); Restrict<PermissionRole, Role>(x => x.RoleId);
        Restrict<ClassRoom, Course>(x => x.CourseId); Restrict<ClassRoom, User>(x => x.TeacherId);
        Restrict<ClassSchedule, ClassRoom>(x => x.ClassId); Restrict<ClassSchedule, User>(x => x.TeacherId);
        Restrict<ParentStudent, Parent>(x => x.ParentId); Restrict<ParentStudent, Student>(x => x.StudentId);
        Restrict<Lead, LeadSource>(x => x.SourceId); Restrict<Lead, LeadStatus>(x => x.StatusId);
        Restrict<Lead, Course>(x => x.InterestedCourseId); Restrict<Lead, User>(x => x.AssignedUserId); Restrict<Lead, Parent>(x => x.ConvertedParentId);
        Restrict<LeadAssignment, Lead>(x => x.LeadId); Restrict<LeadAssignment, User>(x => x.AssignedTo); Restrict<LeadAssignment, User>(x => x.AssignedBy);
        Restrict<LeadNote, Lead>(x => x.LeadId); Restrict<LeadNote, User>(x => x.UserId);
        Restrict<LeadActivity, Lead>(x => x.LeadId); Restrict<LeadActivity, User>(x => x.UserId);
        Restrict<TrialSession, Lead>(x => x.LeadId); Restrict<TrialSession, Student>(x => x.StudentId); Restrict<TrialSession, Course>(x => x.CourseId); Restrict<TrialSession, ClassRoom>(x => x.ClassId); Restrict<TrialSession, User>(x => x.StaffId);
        Restrict<Enrollment, Student>(x => x.StudentId); Restrict<Enrollment, ClassRoom>(x => x.ClassId); Restrict<Enrollment, User>(x => x.RegisteredBy);
        Restrict<Invoice, Parent>(x => x.ParentId); Restrict<Invoice, Student>(x => x.StudentId); Restrict<Invoice, Enrollment>(x => x.EnrollmentId);
        Restrict<InvoiceItem, Invoice>(x => x.InvoiceId);
        Restrict<Payment, Invoice>(x => x.InvoiceId); Restrict<Payment, Parent>(x => x.ParentId); Restrict<Payment, Student>(x => x.StudentId); Restrict<Payment, User>(x => x.CreatedBy);
        Restrict<WorkTask, User>(x => x.AssignedTo); Restrict<Notification, User>(x => x.UserId); Restrict<AuditLog, User>(x => x.UserId);
        Restrict<LeadConversion, Lead>(x => x.LeadId); Restrict<LeadConversion, Parent>(x => x.ParentId); Restrict<LeadConversion, Student>(x => x.StudentId); Restrict<LeadConversion, Enrollment>(x => x.EnrollmentId); Restrict<LeadConversion, Invoice>(x => x.InvoiceId); Restrict<LeadConversion, User>(x => x.ConvertedBy);
        Restrict<OrganizationMembership, Organization>(x => x.OrganizationId); Restrict<OrganizationMembership, User>(x => x.UserId); Restrict<OrganizationMembership, User>(x => x.ManagerUserId);
        Restrict<ChannelCustomer, User>(x => x.CreatedByUserId); Restrict<ChannelCustomer, Organization>(x => x.OrganizationId);
        Restrict<CustomerIdentifier, ChannelCustomer>(x => x.CustomerId);
        Restrict<ApproachRegistration, ChannelCustomer>(x => x.CustomerId); Restrict<ApproachRegistration, User>(x => x.OwnerUserId); Restrict<ApproachRegistration, Organization>(x => x.OwnerOrganizationId); Restrict<ApproachRegistration, User>(x => x.CreatedByUserId);
        Restrict<CustomerActivity, ChannelCustomer>(x => x.CustomerId); Restrict<CustomerActivity, ApproachRegistration>(x => x.ApproachRegistrationId); Restrict<CustomerActivity, User>(x => x.UserId);
        Restrict<SalesContract, ChannelCustomer>(x => x.CustomerId); Restrict<SalesContract, ApproachRegistration>(x => x.ApproachRegistrationId); Restrict<SalesContract, User>(x => x.OwnerUserId); Restrict<SalesContract, Organization>(x => x.OwnerOrganizationId); Restrict<SalesContract, User>(x => x.ReportedByUserId);
        Restrict<SalesContractItem, SalesContract>(x => x.ContractId); Restrict<SalesContractItem, CheckeeProductPackage>(x => x.ProductPackageId);
        Restrict<CustomerProtection, ChannelCustomer>(x => x.CustomerId); Restrict<CustomerProtection, User>(x => x.OwnerUserId); Restrict<CustomerProtection, Organization>(x => x.OwnerOrganizationId); Restrict<CustomerProtection, ApproachRegistration>(x => x.ApproachRegistrationId); Restrict<CustomerProtection, SalesContract>(x => x.ContractId);
        Restrict<RevenueSchedule, SalesContract>(x => x.ContractId);
        Restrict<RevenueReceipt, SalesContract>(x => x.ContractId); Restrict<RevenueReceipt, RevenueSchedule>(x => x.RevenueScheduleId); Restrict<RevenueReceipt, User>(x => x.RecordedByUserId);
        Restrict<CommissionPolicyVersion, Organization>(x => x.OrganizationId); Restrict<CommissionPolicyVersion, User>(x => x.CreatedByUserId);
        Restrict<CommissionLedgerEntry, SalesContract>(x => x.ContractId); Restrict<CommissionLedgerEntry, RevenueReceipt>(x => x.RevenueReceiptId); Restrict<CommissionLedgerEntry, CommissionPolicyVersion>(x => x.PolicyVersionId); Restrict<CommissionLedgerEntry, User>(x => x.BeneficiaryUserId); Restrict<CommissionLedgerEntry, Organization>(x => x.BeneficiaryOrganizationId); Restrict<CommissionLedgerEntry, User>(x => x.CreatedByUserId);
        Restrict<CommissionLedgerEntry, CommissionLedgerEntry>(x => x.RelatedEntryId);
        Restrict<Payout, Organization>(x => x.OrganizationId); Restrict<Payout, User>(x => x.CreatedByUserId); Restrict<PayoutItem, Payout>(x => x.PayoutId); Restrict<PayoutItem, CommissionLedgerEntry>(x => x.CommissionLedgerEntryId);
        Restrict<Payout, User>(x => x.BeneficiaryUserId); Restrict<Payout, User>(x => x.ApprovedByUserId); Restrict<Payout, User>(x => x.PaidByUserId);
        Restrict<PayoutEvent, Payout>(x => x.PayoutId); Restrict<PayoutEvent, User>(x => x.ActorUserId);
        Restrict<ReconciliationCase, ChannelCustomer>(x => x.CustomerId); Restrict<ReconciliationCase, SalesContract>(x => x.ContractId); Restrict<ReconciliationCase, Organization>(x => x.CheckeeOrganizationId);
        Restrict<ReconciliationEvent, ReconciliationCase>(x => x.ReconciliationCaseId); Restrict<ReconciliationEvent, User>(x => x.ActorUserId);
    }

    private static void UniqueCode<TEntity>(ModelBuilder b, int length) where TEntity : class
    {
        b.Entity<TEntity>().Property("Code").HasMaxLength(length);
        b.Entity<TEntity>().HasIndex("Code").IsUnique();
    }

    private static void Money<TEntity>(ModelBuilder b, System.Linq.Expressions.Expression<Func<TEntity, decimal>> property) where TEntity : class =>
        b.Entity<TEntity>().Property(property).HasPrecision(19, 0);

    private static void DateOnlyProperty(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<DateOnly> property) =>
        property.HasConversion(value => value.ToDateTime(TimeOnly.MinValue), value => DateOnly.FromDateTime(value)).HasColumnType("date");

    private static void DateOnlyProperty(Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<DateOnly?> property) =>
        property.HasConversion(
            value => value.HasValue ? value.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
            value => value.HasValue ? DateOnly.FromDateTime(value.Value) : (DateOnly?)null).HasColumnType("date");

    private static string ToSnakeCase(string value)
    {
        var result = new StringBuilder(value.Length + 8);
        for (var i = 0; i < value.Length; i++)
        {
            var current = value[i];
            if (char.IsUpper(current) && i > 0 && (char.IsLower(value[i - 1]) || (i + 1 < value.Length && char.IsLower(value[i + 1])))) result.Append('_');
            result.Append(char.ToLowerInvariant(current));
        }
        return result.ToString();
    }
}
