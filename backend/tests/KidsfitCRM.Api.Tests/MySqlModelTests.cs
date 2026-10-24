using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;

namespace KidsfitCRM.Api.Tests;

public sealed class MySqlModelTests
{
    private static KidsfitDbContext Context() => new(new DbContextOptionsBuilder<KidsfitDbContext>()
        .UseMySQL("Server=127.0.0.1;Database=kidsfit_test;User=test;Password=test;").Options);

    [Fact]
    public void Money_is_exact_and_never_floating_point()
    {
        using var db = Context();
        var property = db.Model.FindEntityType(typeof(Invoice))!.FindProperty(nameof(Invoice.FinalAmount))!;
        Assert.Equal(19, property.GetPrecision());
        Assert.Equal(0, property.GetScale());
        Assert.Equal(typeof(decimal), property.ClrType);
    }

    [Fact]
    public void Idempotency_keys_are_binary_collated_and_unique()
    {
        using var db = Context();
        var entity = db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(LeadConversion))!;
        var property = entity.FindProperty(nameof(LeadConversion.IdempotencyKey))!;
        Assert.Equal("utf8mb4_bin", property.GetCollation());
        Assert.Contains(entity.GetIndexes(), index => index.IsUnique && index.Properties.SequenceEqual([property]));
    }

    [Fact]
    public void Parent_student_relation_is_explicit()
    {
        using var db = Context();
        var entity = db.Model.FindEntityType(typeof(ParentStudent))!;
        Assert.Equal("parent_student", entity.GetTableName());
        Assert.Contains(entity.GetForeignKeys(), key => key.PrincipalEntityType.ClrType == typeof(Parent));
        Assert.Contains(entity.GetForeignKeys(), key => key.PrincipalEntityType.ClrType == typeof(Student));
    }

    [Fact]
    public void Channel_sales_idempotency_keys_are_binary_collated_and_unique()
    {
        using var db = Context();
        var model = db.GetService<IDesignTimeModel>().Model;
        foreach (var entityType in new[] { typeof(ApproachRegistration), typeof(SalesContract), typeof(RevenueReceipt) })
        {
            var entity = model.FindEntityType(entityType)!;
            var property = entity.FindProperty("IdempotencyKey")!;
            Assert.Equal("utf8mb4_bin", property.GetCollation());
            Assert.Contains(entity.GetIndexes(), index => index.IsUnique && index.Properties.SequenceEqual([property]));
        }
    }

    [Fact]
    public void Channel_sales_money_is_exact_and_financial_records_are_separate()
    {
        using var db = Context();
        var model = db.Model;
        var contractAmount = model.FindEntityType(typeof(SalesContract))!.FindProperty(nameof(SalesContract.TotalValue))!;
        var receiptAmount = model.FindEntityType(typeof(RevenueReceipt))!.FindProperty(nameof(RevenueReceipt.Amount))!;
        var commissionAmount = model.FindEntityType(typeof(CommissionLedgerEntry))!.FindProperty(nameof(CommissionLedgerEntry.Amount))!;
        Assert.All(new[] { contractAmount, receiptAmount, commissionAmount }, property =>
        {
            Assert.Equal(19, property.GetPrecision());
            Assert.Equal(0, property.GetScale());
            Assert.Equal(typeof(decimal), property.ClrType);
        });
        Assert.NotNull(model.FindEntityType(typeof(CustomerProtection)));
        Assert.NotNull(model.FindEntityType(typeof(ReconciliationCase)));
    }
}
