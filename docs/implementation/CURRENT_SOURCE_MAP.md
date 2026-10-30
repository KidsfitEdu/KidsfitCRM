# KidsfitCRM — live source map and safety notes

**Baseline:** `develop` commit `8a14a9436a24a6edadbccaf7c04f43b7508af1c0`, static read 2026-10-30. **Refresh from checkout HEAD before each coding phase.** This map is accurate to source paths at inspection time; it does not assert feature completeness.

## Application layout

| Area | Current location | Notes |
| --- | --- | --- |
| API startup/config | `backend/src/KidsfitCRM.Api/Program.cs` | JWT, authorization, DI; `--migrate` flag and optional `--seed-demo` |
| Web API actions/endpoints | `backend/src/KidsfitCRM.Api/Features/` | Modular monolith; school actions already exist |
| Domain entities | `backend/src/KidsfitCRM.Api/Domain/` | ChannelSales and education-center contexts coexist |
| EF Core DbContext/config | `backend/src/KidsfitCRM.Api/Infrastructure/KidsfitDbContext.cs`, `SchoolModelConfiguration.cs`, `SchoolOperationsModelConfiguration.cs` | MySQL 8.4, EF Core 10; inspect schema before changes |
| Applied migration sources | `backend/src/KidsfitCRM.Api/Infrastructure/Migrations/` | Never modify/delete already-applied migration files |
| Seed/demo fixtures | `backend/src/KidsfitCRM.Api/Infrastructure/DatabaseSeeder.cs`, `CrmScenarioSeeder.cs` | Synthetic data only in disposable local/demo DB |
| Backend tests | `backend/tests/KidsfitCRM.Api.Tests/`, `backend/test-mysql.ps1`, `backend/KidsfitCRM.slnx` | Tests with isolated MySQL instance |
| Vinext routes | `frontend/src/app/` (not `frontend/app/`) | `src/app/crm/[view]/page.tsx` |
| UI role screens | `frontend/src/screens/{Admin,SalesManager,SalesStaff,Collaborator,Checkee,Board,Accounting,CustomerCare,Auth}/` | Seven business roles but legacy page groups remain until reviewed migration |
| UI shell/nav | `frontend/src/components/crm/crm-app.tsx`, `frontend/src/components/layout/{AppShell,Header,Sidebar}.tsx` | Preserve session and deep-link handling |
| Reusable components | `frontend/src/components/common/`, `frontend/src/components/ui/` | Reuse before adding duplicates |
| Page registry/routing | `frontend/src/config/navigation.ts`, `role-pages.ts`, `routes.ts` | View IDs and UI page groups are not database roles |
| API transport | `frontend/src/services/api.client.ts` + domain services | Keep JWT/error contract |
| Theme/tokens | `frontend/src/app/globals.css` | Tailwind CSS 4, KIDSFIT palette, dark mode |
| Frontend tests | `frontend/tests/` and `.github/workflows/frontend-refactor.yml` | Includes demo, pages, CI browser smoke |

## Backend business hotspots

- Proposal chain: `Features/SchoolProposalActions.cs` (Sales → assigned manager → Admin; proposal revisions).
- Capacity: `Features/SchoolActions.cs` (`IsCollaborator`, `CheckSchoolCapacity`, `ChangeSchoolCapacity`): currently restricts only collaborators; target all Sales.
- Allocation/extension: `Features/SchoolAllocationActions.cs` (`InviteSchoolCollaborator`, `RespondSchoolInvitation`, `RequestSchoolExtension`, `ReviewSchoolExtension`).
- Contracts/protection: `Features/SchoolActions.cs` (`ReviewSchoolContract`, `GrantSchoolProtection`) and `Features/SchoolEndpoints.cs`; CHECKEE reconciliation handlers in `Features/ChannelSales*`.
- Role permissions and seed: `Infrastructure/DatabaseSeeder.cs`, `Features/ChannelSalesAccess.cs`, `Features/AuthFeatures.cs`.
- Account, commission and payout: `Features/ChannelSalesFinanceActions.cs`, `SchoolFinanceActions.cs`, `SchoolCareActions.cs`, `Infrastructure/KidsfitDbContext.cs`.

## Frontend current paths — avoid old locations

| Historical path in older skill/docs | Current file |
| --- | --- |
| `frontend/app/globals.css` | `frontend/src/app/globals.css` |
| `frontend/components/crm/crm-app.tsx` | `frontend/src/components/crm/crm-app.tsx` |
| `frontend/components/common/admin-list-ui.tsx` / `frontend/components/crm/admin/admin-list-ui.tsx` | `frontend/src/components/common/admin-list-ui.tsx` |
| `frontend/components/common/app-page-header.tsx` | `frontend/src/components/common/app-page-header.tsx` |
| `frontend/components/crm/admin/admin-workspace.tsx` | `frontend/src/screens/Admin/Proposals/ProposalsPage.tsx` (proposal screen); `frontend/src/screens/Admin/AdminWorkspace.tsx` (role workspace) |
| `frontend/components/layout/Sidebar.tsx` | `frontend/src/components/layout/Sidebar.tsx` |
| `frontend/lib/demo-auth.ts` | `frontend/src/lib/demo-auth.ts` |
| `frontend/services/api.client.ts` | `frontend/src/services/api.client.ts` |

The public Pages demo remains separate: `frontend/demo/`, `frontend/vite.pages.config.ts`, `frontend/public/`. Do not confuse static demo behavior with authenticated real API and role scopes.

## Local/test data and scripts

- `start-local.ps1` provisions **local MySQL** at `.runtime/mysql-data-net10` (expected port **3307**) and invokes `dotnet run --project src/KidsfitCRM.Api --no-launch-profile -- --migrate --seed-demo`. It also includes **demo-only hardcoded MySQL credentials** and can modify the local root/user configuration; **inspect before running and never point it at shared/prod MySQL**.
- `compose.yaml` uses MySQL 8.4 and an `api-migrate` job, with `Seed__DemoEnabled` configured for demo. Treat it as local/demo-only until reviewed and hardened.
- `backend/README.md` documents `--migrate` and opt-in `--seed-demo`; `Program.cs` calls `Database.MigrateAsync` in migrate mode. **Migration ≠ seed ≠ dump**.
- `backend/test-mysql.ps1` reads `KIDSFIT_TEST_MYSQL_ADMIN` and runs `dotnet test`; integration tests must use a dedicated instance/database and must never be given a production admin DSN.
- For **mysqldump backup**, identify and approve source first; do not expose credentials to logs or Git. Verify restore into a *new*, isolated DB. No production dump should be placed in the repository.

## Code preservation and change control

Preserve functioning modules even when no longer part of the immediate Sales CRM task (parents, students, classes, enrollment, billing). Preserve existing migrations, `role_user`, contracts, payouts, customer ownership, audits and commission ledger. Refactor using adapters/permissions under tests, not destructive renames. Business target: 7 roles, Sales can self-register and be allocated, default 10 active schools, 5 days initial + 7 days × 3 extension, Manager KIDSFIT/partner → CHECKEE, Director overseeing rather than per-contract approving, 30% **provisional**, no referrer/split. See [business rules](../requirements/BUSINESS_RULES.md) and [gap matrix](../requirements/CODEBASE_GAP_ANALYSIS.md).
