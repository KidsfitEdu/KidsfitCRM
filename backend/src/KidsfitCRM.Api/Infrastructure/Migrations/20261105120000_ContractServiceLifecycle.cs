using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261105120000_ContractServiceLifecycle")]
public sealed class ContractServiceLifecycle : Migration
{
    protected override void Up(MigrationBuilder m)
    {
        m.CreateTable("contract_service_terms", columns: table => new {
            id = table.Column<long>(type:"bigint",nullable:false).Annotation("MySQL:ValueGenerationStrategy",MySQLValueGenerationStrategy.IdentityColumn),
            contract_id = table.Column<long>(type:"bigint",nullable:false),
            customer_id = table.Column<long>(type:"bigint",nullable:false),
            term_number = table.Column<int>(type:"int",nullable:false),
            start_on = table.Column<DateOnly>(type:"date",nullable:false),
            end_on = table.Column<DateOnly>(type:"date",nullable:false),
            billing_cycle = table.Column<string>(type:"varchar(24)",maxLength:24,nullable:false),
            status = table.Column<string>(type:"varchar(24)",maxLength:24,nullable:false),
            evidence_reference = table.Column<string>(type:"varchar(500)",maxLength:500,nullable:false),
            submitted_by_user_id = table.Column<long>(type:"bigint",nullable:false),
            verified_by_user_id = table.Column<long>(type:"bigint",nullable:true),
            verified_at = table.Column<DateTime>(type:"datetime(6)",nullable:true),
            created_at = table.Column<DateTime>(type:"datetime(6)",nullable:false),
            updated_at = table.Column<DateTime>(type:"datetime(6)",nullable:false)
        },constraints:table=>{
            table.PrimaryKey("PK_contract_service_terms",x=>x.id);
            table.ForeignKey("FK_service_term_contract",x=>x.contract_id,"sales_contracts","id",onDelete:ReferentialAction.Restrict);
            table.ForeignKey("FK_service_term_customer",x=>x.customer_id,"channel_customers","id",onDelete:ReferentialAction.Restrict);
            table.ForeignKey("FK_service_term_submitter",x=>x.submitted_by_user_id,"users","id",onDelete:ReferentialAction.Restrict);
            table.ForeignKey("FK_service_term_verifier",x=>x.verified_by_user_id,"users","id",onDelete:ReferentialAction.Restrict);
        });
        m.CreateIndex("IX_contract_service_terms_contract_id_term_number","contract_service_terms",new[]{"contract_id","term_number"},unique:true);
        m.CreateIndex("IX_contract_service_terms_customer_id_status_end_on","contract_service_terms",new[]{"customer_id","status","end_on"});
        m.CreateIndex("IX_contract_service_terms_submitted_by_user_id","contract_service_terms","submitted_by_user_id");
        m.CreateIndex("IX_contract_service_terms_verified_by_user_id","contract_service_terms","verified_by_user_id");

        m.CreateTable("contract_lifecycle_alerts", columns:table=>new {
            id=table.Column<long>(type:"bigint",nullable:false).Annotation("MySQL:ValueGenerationStrategy",MySQLValueGenerationStrategy.IdentityColumn),
            service_term_id=table.Column<long>(type:"bigint",nullable:true),
            customer_id=table.Column<long>(type:"bigint",nullable:false),
            recipient_user_id=table.Column<long>(type:"bigint",nullable:false),
            kind=table.Column<string>(type:"varchar(40)",maxLength:40,nullable:false),
            deadline_on=table.Column<DateOnly>(type:"date",nullable:false),
            deduplication_key=table.Column<string>(type:"varchar(150)",maxLength:150,nullable:false,collation:"utf8mb4_bin"),
            read_at=table.Column<DateTime>(type:"datetime(6)",nullable:true),
            created_at=table.Column<DateTime>(type:"datetime(6)",nullable:false),
            updated_at=table.Column<DateTime>(type:"datetime(6)",nullable:false)
        },constraints:table=>{
            table.PrimaryKey("PK_contract_lifecycle_alerts",x=>x.id);
            table.ForeignKey("FK_lifecycle_alert_term",x=>x.service_term_id,"contract_service_terms","id",onDelete:ReferentialAction.Restrict);
            table.ForeignKey("FK_lifecycle_alert_customer",x=>x.customer_id,"channel_customers","id",onDelete:ReferentialAction.Restrict);
            table.ForeignKey("FK_lifecycle_alert_recipient",x=>x.recipient_user_id,"users","id",onDelete:ReferentialAction.Restrict);
        });
        m.CreateIndex("IX_contract_lifecycle_alerts_deduplication_key","contract_lifecycle_alerts","deduplication_key",unique:true);
        m.CreateIndex("ix_lifecycle_alert_recipient_read_created","contract_lifecycle_alerts",new[]{"recipient_user_id","read_at","created_at"});
        m.CreateIndex("IX_contract_lifecycle_alerts_customer_id","contract_lifecycle_alerts","customer_id");
        m.CreateIndex("IX_contract_lifecycle_alerts_service_term_id","contract_lifecycle_alerts","service_term_id");

        m.CreateTable("contract_service_events",columns:table=>new {
            id=table.Column<long>(type:"bigint",nullable:false).Annotation("MySQL:ValueGenerationStrategy",MySQLValueGenerationStrategy.IdentityColumn),
            service_term_id=table.Column<long>(type:"bigint",nullable:true),
            customer_id=table.Column<long>(type:"bigint",nullable:false),
            actor_user_id=table.Column<long>(type:"bigint",nullable:true),
            kind=table.Column<string>(type:"varchar(40)",maxLength:40,nullable:false),
            reason=table.Column<string>(type:"text",nullable:false),
            created_at=table.Column<DateTime>(type:"datetime(6)",nullable:false),
            updated_at=table.Column<DateTime>(type:"datetime(6)",nullable:false)
        },constraints:table=>{
            table.PrimaryKey("PK_contract_service_events",x=>x.id);
            table.ForeignKey("FK_service_event_term",x=>x.service_term_id,"contract_service_terms","id",onDelete:ReferentialAction.Restrict);
            table.ForeignKey("FK_service_event_customer",x=>x.customer_id,"channel_customers","id",onDelete:ReferentialAction.Restrict);
            table.ForeignKey("FK_service_event_actor",x=>x.actor_user_id,"users","id",onDelete:ReferentialAction.Restrict);
        });
        m.CreateIndex("IX_contract_service_events_customer_id_created_at","contract_service_events",new[]{"customer_id","created_at"});
        m.CreateIndex("IX_contract_service_events_service_term_id","contract_service_events","service_term_id");
        m.CreateIndex("IX_contract_service_events_actor_user_id","contract_service_events","actor_user_id");
    }

    protected override void Down(MigrationBuilder m)
    {
        m.DropTable("contract_lifecycle_alerts");
        m.DropTable("contract_service_events");
        m.DropTable("contract_service_terms");
    }
}
