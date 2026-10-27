using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using KidsfitCRM.Api.Infrastructure;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    [DbContext(typeof(KidsfitDbContext))]
    [Migration("20261027134500_AddSchoolProposalRevisions")]
    public partial class AddSchoolProposalRevisions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>("version", "school_proposals", type: "int", nullable: false, defaultValue: 1);
            migrationBuilder.CreateTable(
                name: "school_proposal_revisions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false).Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    school_proposal_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    version = table.Column<int>(type: "int", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    before_values = table.Column<string>(type: "json", nullable: false),
                    after_values = table.Column<string>(type: "json", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_proposal_revisions", x => x.id);
                    table.ForeignKey("FK_school_proposal_revisions_school_proposals_school_proposal_id", x => x.school_proposal_id, "school_proposals", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_school_proposal_revisions_users_actor_user_id", x => x.actor_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
                });
            migrationBuilder.CreateIndex("IX_school_proposal_revisions_school_proposal_id_version", "school_proposal_revisions", new[] { "school_proposal_id", "version" }, unique: true);
            migrationBuilder.CreateIndex("IX_school_proposal_revisions_actor_user_id", "school_proposal_revisions", "actor_user_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
            => throw new NotSupportedException("School proposal audit history must be preserved. Use a reviewed forward migration.");
    }
}
