using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

public sealed partial class KidsfitDbContext
{
    public DbSet<SchoolWorkflowPolicyVersion> SchoolWorkflowPolicies => Set<SchoolWorkflowPolicyVersion>();
    public DbSet<SchoolProposal> SchoolProposals => Set<SchoolProposal>();
    public DbSet<SchoolInvitation> SchoolInvitations => Set<SchoolInvitation>();
    public DbSet<SchoolExtensionRequest> SchoolExtensionRequests => Set<SchoolExtensionRequest>();
    public DbSet<SchoolDispute> SchoolDisputes => Set<SchoolDispute>();
    public DbSet<SchoolDeferral> SchoolDeferrals => Set<SchoolDeferral>();
    public DbSet<SchoolHandover> SchoolHandovers => Set<SchoolHandover>();
    public DbSet<SchoolUnitRevision> SchoolUnitRevisions => Set<SchoolUnitRevision>();
    public DbSet<ContractCareHandover> ContractCareHandovers => Set<ContractCareHandover>();
    public DbSet<CustomerSupportCase> CustomerSupportCases => Set<CustomerSupportCase>();
    public DbSet<ContractCancellation> ContractCancellations => Set<ContractCancellation>();
    public DbSet<RevenueRefund> RevenueRefunds => Set<RevenueRefund>();

    private static void ConfigureSchoolOperations(ModelBuilder b)
    {
        var types = new[] { typeof(SchoolProposal), typeof(SchoolInvitation), typeof(SchoolExtensionRequest), typeof(SchoolDispute),
            typeof(SchoolDeferral), typeof(SchoolHandover), typeof(ContractCareHandover), typeof(CustomerSupportCase),
            typeof(ContractCancellation), typeof(RevenueRefund) };
        foreach (var type in types)
        {
            var entity = b.Entity(type);
            entity.Property<string>("IdempotencyKey").HasMaxLength(120).UseCollation("utf8mb4_bin");
            entity.HasIndex("IdempotencyKey").IsUnique();
            entity.Property<string>("RequestFingerprint").HasMaxLength(64).UseCollation("utf8mb4_bin");
        }
        foreach (var type in types.Concat([typeof(SchoolWorkflowPolicyVersion), typeof(SchoolUnitRevision)]))
        {
            var entity = b.Entity(type);
            foreach (var property in entity.Metadata.GetProperties().Where(x => x.ClrType == typeof(string)))
            {
                if (property.Name is "Reason" or "DecisionReason" or "Progress" or "Description" or "Summary" or "Outcome")
                    entity.Property(property.Name).HasColumnType("text");
                else if (property.Name is "BeforeValues" or "AfterValues") entity.Property(property.Name).HasColumnType("json");
                else if (property.GetMaxLength() is null) entity.Property(property.Name).HasMaxLength(property.Name switch
                {
                    "Name" => 500, "Address" => 500, "EvidenceReference" => 500, "ContactName" => 500,
                    "SchoolCode" => 64, "Province" or "Ward" => 100, "Email" => 190, "ContactPhone" => 40,
                    "Subject" => 190, "ContactPosition" or "ReferenceCode" or "DecisionReference" => 120,
                    _ => 32,
                });
            }
        }
        b.Entity<SchoolProposal>().Property(x => x.SchoolCode).UseCollation("utf8mb4_bin");
        b.Entity<SchoolProposal>().HasIndex(x => new { x.ManagerUserId, x.Status, x.ReviewDueAt });
        b.Entity<SchoolProposal>().HasIndex(x => new { x.Status, x.ReviewDueAt });
        b.Entity<SchoolInvitation>().HasIndex(x => new { x.DirectorySchoolId, x.Status, x.RespondBy });
        b.Entity<SchoolInvitation>().HasIndex(x => new { x.AssigneeUserId, x.Status });
        b.Entity<SchoolExtensionRequest>().HasIndex(x => new { x.ApproachRegistrationId, x.Status });
        b.Entity<SchoolExtensionRequest>().HasIndex(x => new { x.ManagerUserId, x.Status, x.ReviewDueAt });
        b.Entity<SchoolWorkflowPolicyVersion>().HasIndex(x => new { x.OrganizationId, x.Version }).IsUnique();
        b.Entity<SchoolWorkflowPolicyVersion>().Property(x => x.RequestFingerprint).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<SchoolWorkflowPolicyVersion>().Property(x => x.DecisionReference).UseCollation("utf8mb4_bin");
        b.Entity<SchoolWorkflowPolicyVersion>().HasIndex(x => new { x.OrganizationId, x.DecisionReference }).IsUnique();
        b.Entity<SchoolUnit>().Property(x => x.Version).IsConcurrencyToken();
        b.Entity<SchoolUnitRevision>().HasIndex(x => new { x.SchoolUnitId, x.Version }).IsUnique();
        b.Entity<RevenueRefund>().Property(x => x.ReferenceCode).UseCollation("utf8mb4_bin");
        b.Entity<RevenueRefund>().HasIndex(x => x.ReferenceCode).IsUnique();
        b.Entity<ContractCancellation>().HasIndex(x => x.ContractId).IsUnique();
        Money<RevenueRefund>(b, x => x.Amount);

        Restrict<SchoolWorkflowPolicyVersion, Organization>(b, x => x.OrganizationId);
        Restrict<SchoolWorkflowPolicyVersion, User>(b, x => x.CreatedByUserId);
        Restrict<SchoolProposal, Organization>(b, x => x.OrganizationId);
        Restrict<SchoolProposal, User>(b, x => x.SubmittedByUserId);
        Restrict<SchoolProposal, User>(b, x => x.ManagerUserId);
        Restrict<SchoolProposal, User>(b, x => x.ReviewedByUserId);
        Restrict<SchoolProposal, DirectorySchool>(b, x => x.DirectorySchoolId);
        Restrict<SchoolInvitation, DirectorySchool>(b, x => x.DirectorySchoolId);
        Restrict<SchoolInvitation, Organization>(b, x => x.OrganizationId);
        Restrict<SchoolInvitation, User>(b, x => x.AssignedByUserId);
        Restrict<SchoolInvitation, User>(b, x => x.AssigneeUserId);
        Restrict<SchoolInvitation, ApproachRegistration>(b, x => x.ApproachRegistrationId);
        Restrict<SchoolExtensionRequest, ApproachRegistration>(b, x => x.ApproachRegistrationId);
        Restrict<SchoolExtensionRequest, Organization>(b, x => x.OrganizationId);
        Restrict<SchoolExtensionRequest, User>(b, x => x.RequestedByUserId);
        Restrict<SchoolExtensionRequest, User>(b, x => x.ManagerUserId);
        Restrict<SchoolExtensionRequest, User>(b, x => x.ReviewedByUserId);
        Restrict<SchoolExtensionRequest, SchoolWorkflowPolicyVersion>(b, x => x.PolicyVersionId);
        Restrict<SchoolDispute, ChannelCustomer>(b, x => x.CustomerId);
        Restrict<SchoolDispute, Organization>(b, x => x.OrganizationId);
        Restrict<SchoolDispute, User>(b, x => x.OpenedByUserId);
        Restrict<SchoolDispute, User>(b, x => x.ResolvedByUserId);
        Restrict<SchoolDeferral, DirectorySchool>(b, x => x.DirectorySchoolId);
        Restrict<SchoolDeferral, Organization>(b, x => x.OrganizationId);
        Restrict<SchoolDeferral, User>(b, x => x.ManagerUserId);
        Restrict<SchoolHandover, OrganizationMembership>(b, x => x.MembershipId);
        Restrict<SchoolHandover, Organization>(b, x => x.OrganizationId);
        Restrict<SchoolHandover, User>(b, x => x.UserId);
        Restrict<SchoolHandover, User>(b, x => x.CompletedByUserId);
        Restrict<SchoolUnitRevision, SchoolUnit>(b, x => x.SchoolUnitId);
        Restrict<SchoolUnitRevision, User>(b, x => x.ActorUserId);
        Restrict<ContractCareHandover, SalesContract>(b, x => x.ContractId);
        Restrict<ContractCareHandover, User>(b, x => x.PreviousUserId);
        Restrict<ContractCareHandover, User>(b, x => x.AssignedUserId);
        Restrict<ContractCareHandover, User>(b, x => x.ActorUserId);
        Restrict<ContractCareHandover, Organization>(b, x => x.CareOrganizationId);
        Restrict<CustomerSupportCase, SalesContract>(b, x => x.ContractId);
        Restrict<CustomerSupportCase, ChannelCustomer>(b, x => x.CustomerId);
        Restrict<CustomerSupportCase, Organization>(b, x => x.OrganizationId);
        Restrict<CustomerSupportCase, User>(b, x => x.AssignedUserId);
        Restrict<CustomerSupportCase, User>(b, x => x.CreatedByUserId);
        Restrict<ContractCancellation, SalesContract>(b, x => x.ContractId);
        Restrict<ContractCancellation, User>(b, x => x.ActorUserId);
        Restrict<RevenueRefund, RevenueReceipt>(b, x => x.RevenueReceiptId);
        Restrict<RevenueRefund, SalesContract>(b, x => x.ContractId);
        Restrict<RevenueRefund, User>(b, x => x.RecordedByUserId);
        Restrict<SalesContract, User>(b, x => x.CareUserId);
        Restrict<SalesContract, Organization>(b, x => x.CareOrganizationId);
        Restrict<CustomerActivity, CustomerSupportCase>(b, x => x.SupportCaseId);
        b.Entity<CustomerActivity>().Property(x => x.ContactName).HasMaxLength(500);
        b.Entity<CustomerActivity>().Property(x => x.ContactPosition).HasMaxLength(120);
        b.Entity<CustomerActivity>().Property(x => x.Feedback).HasMaxLength(2000);
        b.Entity<CustomerActivity>().Property(x => x.Commitment).HasMaxLength(2000);
    }
}
