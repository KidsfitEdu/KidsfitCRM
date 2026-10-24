using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

public sealed partial class KidsfitDbContext
{
    public DbSet<DirectorySchool> DirectorySchools => Set<DirectorySchool>();
    public DbSet<SchoolUnit> SchoolUnits => Set<SchoolUnit>();
    public DbSet<SchoolImportBatch> SchoolImportBatches => Set<SchoolImportBatch>();
    public DbSet<SchoolCapacityChange> SchoolCapacityChanges => Set<SchoolCapacityChange>();

    private static void ConfigureSchools(ModelBuilder b)
    {
        b.Entity<OrganizationMembership>().Property(x => x.SchoolApproachLimit).HasDefaultValue(10);
        b.Entity<DirectorySchool>().Property(x => x.SchoolCode).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<DirectorySchool>().HasIndex(x => x.SchoolCode).IsUnique();
        b.Entity<DirectorySchool>().HasIndex(x => x.CustomerId).IsUnique();
        b.Entity<SchoolUnit>().Property(x => x.ContentHash).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<SchoolUnit>().HasIndex(x => new { x.DirectorySchoolId, x.ContentHash }).IsUnique();
        b.Entity<SchoolUnit>().Property(x => x.UnitType).HasMaxLength(16);
        b.Entity<SchoolUnit>().Property(x => x.Name).HasMaxLength(500);
        b.Entity<SchoolUnit>().Property(x => x.Province).HasMaxLength(100);
        b.Entity<SchoolUnit>().Property(x => x.Ward).HasMaxLength(100);
        b.Entity<SchoolUnit>().Property(x => x.Address).HasMaxLength(500);
        b.Entity<SchoolUnit>().Property(x => x.ContactName).HasMaxLength(500);
        b.Entity<SchoolUnit>().Property(x => x.ContactPosition).HasMaxLength(120);
        b.Entity<SchoolUnit>().Property(x => x.ContactPhone).HasMaxLength(40);
        b.Entity<SchoolUnit>().Property(x => x.SchoolPhone).HasMaxLength(40);
        b.Entity<SchoolUnit>().Property(x => x.Email).HasMaxLength(190);
        b.Entity<SchoolUnit>().Property(x => x.Note).HasColumnType("text");
        b.Entity<SchoolImportBatch>().Property(x => x.IdempotencyKey).HasMaxLength(120).UseCollation("utf8mb4_bin");
        b.Entity<SchoolImportBatch>().HasIndex(x => x.IdempotencyKey).IsUnique();
        b.Entity<SchoolImportBatch>().Property(x => x.FileHash).HasMaxLength(64).UseCollation("utf8mb4_bin");
        b.Entity<SchoolCapacityChange>().Property(x => x.Reason).HasMaxLength(2000);
        Restrict<DirectorySchool, ChannelCustomer>(b, x => x.CustomerId);
        Restrict<SchoolUnit, DirectorySchool>(b, x => x.DirectorySchoolId);
        Restrict<SchoolImportBatch, User>(b, x => x.ActorUserId);
        Restrict<SchoolImportBatch, Organization>(b, x => x.OrganizationId);
        Restrict<SchoolCapacityChange, OrganizationMembership>(b, x => x.MembershipId);
        Restrict<SchoolCapacityChange, User>(b, x => x.ActorUserId);
        Restrict<SalesContract, User>(b, x => x.ManagerReviewedByUserId);
    }

    private static void Restrict<T, TParent>(ModelBuilder b, System.Linq.Expressions.Expression<Func<T, object?>> key) where T : class where TParent : class =>
        b.Entity<T>().HasOne<TParent>().WithMany().HasForeignKey(key).OnDelete(DeleteBehavior.Restrict);
}
