# CRM implementation gap analysis — source snapshot

**Inspected:** \`develop\` at \`8a14a9436a24a6edadbccaf7c04f43b7508af1c0\`, 2026-10-30. This is **static source inspection only**. It is **not** a database audit, executed test result, code migration, or proof that all features work. Refresh against the current head before implementation. File-level map: [Current source map](../implementation/CURRENT_SOURCE_MAP.md).

The business target lives in \`docs/requirements/\`, particularly \`DECISION_LOG.md\`. Current source can intentionally lag behind target requirements. No existing role or financial record may be deleted just to make names appear consistent.

| Gap | Concrete current source evidence | Required target / preservation | Priority |
| --- | --- | --- | --- |
| GAP-01 Roles | \`backend/src/KidsfitCRM.Api/Infrastructure/DatabaseSeeder.cs\` still seeds \`BOARD\`, \`CUSTOMER_CARE\`, \`CHANNEL_SALES\`, \`PARTNER_ADMIN\`, \`PARTNER_COLLABORATOR\` alongside current codes; \`frontend/src/lib/demo-auth.ts\` uses separate demo profiles | 7 business roles including one Sales; preserve legacy role assignments, organizations, log and backward compatibility | P0 |
| GAP-02 Sales quota | \`backend/src/KidsfitCRM.Api/Features/SchoolActions.cs\`: \`IsCollaborator()\` gates both \`ChangeSchoolCapacity\` and \`CheckSchoolCapacity\`; internal Sales bypass current quota | Both employee and collaborator Sales have default 10 active schools, adjustable by Admin, including concurrent allocations | P0 |
| GAP-03 Extension | \`backend/src/KidsfitCRM.Api/Features/SchoolAllocationActions.cs\` enforces \`SchoolWorkflowPolicyVersion\` active \`MaxExtensionDays\`, \`MaxExtensionCount\`; historical Notes record draft 7 days × 2 | Approved initial 5 days + 7 days per approval × 3 approvals, versioned policy; reject fourth; preserve prior valid ownership | P0 |
| GAP-04 Contract verification | \`SchoolActions.cs\` implements Manager \`ReviewSchoolContract\` then separate \`GrantSchoolProtection\`, requiring CHECKEE verified reconciliation; \`SchoolEndpoints.cs\` has \`/school-contracts/{id}/review\` and \`/grant-protection\` | Partner or KIDSFIT manager submits directly to CHECKEE; verified KIDSFIT grant is separate. Who can grant at KIDSFIT is still **OPEN**, not permission to silently assign Admin or Director | P0/OPEN |
| GAP-05 Proposal routing | \`SchoolProposalActions.cs\` already takes \`ManagerUserId\`, then \`PENDING_MANAGER\` → \`PENDING_ADMIN\` with audit, versions and validation; \`frontend/src/screens/Admin/Proposals/ProposalsPage.tsx\` handles Admin review | Preserve working Manager-first workflow, fix only proven gaps and verify per-tenant scopes | Verify |
| GAP-06 Commissions | \`DatabaseSeeder.cs\` inserts demo commission policies at 10%/12% and ceilings 20%/15%; \`KidsfitDbContext.cs\` has versioned commission and append-style ledger | Proposed 30% for Sales is **not** approved payout policy: do not auto-activate or rewrite ledger; qualifying base and triggers still OPEN | P0/OPEN |
| GAP-07 Frontend architecture | Frontend **already migrated** under \`frontend/src/\`: \`src/app/\`, \`src/screens/\`, \`src/components/\`, \`src/config/\`, \`src/services/\`; role screens \`SalesStaff/\` and \`Collaborator/\` remain separate; \`frontend/docs/architecture.md\` describes incremental migration | Retain existing Vinext routes and role page IDs; converge to shared Sales UI through tested compatible adapters (not deleting page groups blindly) | P1 |
| GAP-08 Skill/design docs stale | UI skill references and \`docs/design/FRONTEND_DESIGN_SYSTEM.md\` still pointed at \`frontend/components/\`, \`frontend/app/\`, Admin proposal old workspace path | Fix paths and descriptions without changing runtime code | This docs PR |
| GAP-09 Demo/seed and DB safety | \`DatabaseSeeder.cs\`, \`CrmScenarioSeeder.cs\`, \`Program.cs\` support explicit \`--migrate --seed-demo\`; \`start-local.ps1\` automatically performs them; \`compose.yaml\` has local demo credentials/config | Distinguish schema migration, synthetic seed and actual dump; isolate DB and never run demo seed on production or copy PII to repo | P0 safety |
| GAP-10 School hierarchy and policy OPEN | \`SchoolWorkbookReader.cs\`, \`SchoolDirectoryEntities.cs\`, \`SchoolModelConfiguration.cs\` support directory and school-unit relations | Scope of protection of a main school/branches and pending-extension hold remains unresolved; don't invent policy | OPEN |
| GAP-11 Preserving bounded contexts | \`backend/src/KidsfitCRM.Api/Domain/Entities.cs\`, \`KidsfitDbContext.cs\` and frontend screens also contain education-center Leads, Parents, Students, Courses, Classes, Invoices | Preserve unrelated CRM education functions and migrations; no destructive refactor | P0 guardrail |
| GAP-12 Test evidence | \`backend/test-mysql.ps1\`, \`backend/tests/KidsfitCRM.Api.Tests/\`; \`frontend/tests/\` + \`.github/workflows/frontend-refactor.yml\` include lint, TS, build, pages and browser smoke | Run baseline and relevant tests on **isolated** DB, report actual PASS/FAIL/SKIPPED/NOT_RUN; static inspection is not test evidence | P0 |

## Source entry points for implementation

- Backend: \`backend/src/KidsfitCRM.Api/Program.cs\`; \`Features/SchoolActions.cs\`, \`SchoolAllocationActions.cs\`, \`SchoolProposalActions.cs\`, \`SchoolEndpoints.cs\`, \`SchoolOperationsEndpoints.cs\`, \`ChannelSalesAccess.cs\`; \`Infrastructure/KidsfitDbContext.cs\`, \`SchoolModelConfiguration.cs\`, \`SchoolOperationsModelConfiguration.cs\`, \`DatabaseSeeder.cs\`, \`CrmScenarioSeeder.cs\`.
- Frontend: \`frontend/src/components/crm/crm-app.tsx\`, \`src/config/navigation.ts\`, \`src/config/role-pages.ts\`, \`src/config/routes.ts\`, \`src/services/api.client.ts\`, \`src/screens/{Admin,SalesManager,SalesStaff,Collaborator,Checkee,Board,Accounting,CustomerCare}/\`.
- Source of build/test: \`frontend/package.json\`, \`frontend/docs/architecture.md\`, \`backend/KidsfitCRM.slnx\`, \`backend/test-mysql.ps1\`, \`.github/workflows/frontend-refactor.yml\`.

## Implementation ordering and non-destructive exit criteria

1. Baseline source+tests+DB inventory, protect any uncommitted changes. Update this analysis from live commit.
2. Plan schema/role **compatibility mapping** and test additive MySQL migrations against populated disposable DB. Never rewrite migration history, ledger or ownership.
3. Align quota and approach rules with active versioned policy (5 days then 7×3) plus concurrency/tenant tests.
4. Verify contract submission Manager→CHECKEE; keep 5-year grant behind existing authorized workflow until **OPEN** KIDSFIT owner is approved.
5. Improve API and UI incrementally using current \`frontend/src/\` components and preserve existing page IDs.
6. Seed synthetic fixtures separately from real MySQL dump/restore; check repeated seed and restore to independent DB.
7. Regression/E2E/browser/financial checks, then update tests, docs and the gap table with actual evidence.

**Verification commands:** \`dotnet test backend/KidsfitCRM.slnx\`; \`backend/test-mysql.ps1\` with \`KIDSFIT_TEST_MYSQL_ADMIN\` on isolated MySQL 8.4; from \`frontend/\`: \`npm ci\`, \`npm run lint\`, \`npx tsc --noEmit\`, \`npm run test:demo\`, \`npm run build\`, \`npm run build:pages\`, \`npm run test:pages\`; browser smoke according to \`.github/workflows/frontend-refactor.yml\`. **Not run in this documentation-only PR.**
