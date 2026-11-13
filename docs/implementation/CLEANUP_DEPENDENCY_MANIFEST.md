# KIDSFIT CRM — cleanup dependency and removal manifest

Base: `develop` @ `97e614e8ec6fd323bc7c703b3a7f2bf492729fb7`  
Branch: `refactor/cleanup-legacy-crm-20261113`  
Review PR: #128 (Ready for review, no merge)

## Scope and safeguards

Cleanup is limited to proven superseded artifacts. Never delete signed contract line descriptions, quantity/price/amount, customer protection history, receipts, commission ledger, payouts, evidence or audit trails. Do not alter already-applied EF migrations; the new migration records the change. A new or disposable MySQL 8.4 database is required for verification; live DB deployment requires a preflight catalog-use audit and backup. Removing the catalog eliminates historical package identifier metadata; the migration writes missing legacy package names into existing fee descriptions before dropping relationships, but **cannot preserve a historical package ID unless separately archived**.

## Dependency decisions (KEEP / MERGE / REMOVE)

| Area | Change | Decision | Proof / consumer |
|---|---|---|---|
| CHECKEE package catalog | `checkee_product_packages`, `sales_contract_items.product_package_id`, catalog entity / DbSet / index / FK | REMOVE via `20261113230000_RemoveLegacyCheckeePackages` | Signed maintenance/setup and price lines are already stored on `sales_contract_items`; all Backend catalog lookups removed |
| Manual contract fees | `description`, `quantity`, `unit_price`, `amount` | KEEP | Report and Manager revision flows, financial reconciliations |
| Catalog API response fields | `packages` in workspace/school detail | REMOVE | No live Sales UI requires catalog |
| Duplicate customer search route | `GET /api/channel-sales/customers/search` forwarding to `Workspace` | REMOVE | `GET /api/channel-sales/workspace` remains canonical |
| Synthetic Backend seeders | 7 legacy seeders previously in API project | MOVE to `backend/tests/KidsfitCRM.Api.Tests/Fixtures/LegacySeeders` | Tests invoke `DatabaseSeeder` and `CrmScenarioSeeder`; production `--seed-demo` is disabled |
| Initial bootstrap | `InitialCrmSeeder`, role/permission/org/admin bootstrap | KEEP | `Program.cs` uses `--migrate --seed-initial` |
| Static demo customer fixtures | `demoChannelSalesWorkspace` | REMOVE | No frontend static demo or runtime fixture remains |
| Static demo school fixtures | `school-demo.ts`, `school-operations-preview.ts` | REMOVE | School directory and operations now call Backend only |
| Live login | `CrmApp` | KEEP real API only | Requires Backend URL/JWT; no `DemoAccount` or mock login |
| Sales / Collaborator | 8 obsolete `src/screens/Collaborator` files | MERGE into existing `SalesStaffWorkspace` and `SalesFocusPage` | `sales-navigation.ts` maps legacy collaborator routes; tests verify aliases |
| Retired UI screens | 10 legacy Board / CHECKEE / CustomerCare / Accounting pages | REMOVE | Existing canonical workspaces render other pages; legacy URL redirects preserved |
| Remaining DB entities and API modules | Remaining business tables, worklog, finance, alert workers, RBAC | KEEP | Live permissions/workers/test consumers; lack of a visible screen is not evidence of unused API |

## Source changes

- Backend: `Domain/ChannelSalesEntities.cs`, `Infrastructure/KidsfitDbContext.cs`, EF snapshot, `Features/ChannelSalesActions.cs`, `ManagerContractEndpoints.cs`, `ChannelSalesContracts.cs`, `ChannelSalesEndpoints.cs`, `SchoolEndpoints.cs`, new migration.
- Backend tests: three large MySQL tests rewritten for signed maintenance/setup fee components, service terms and cycle; historical-term repair test explicitly constructs an old contract; seven synthetic seeders moved to test-only fixtures, retaining test scenarios.
- Frontend: `crm-app.tsx`, `Sidebar.tsx`, `school-directory.tsx`, `school-operations.tsx`, `ManagerWorklists.tsx`, navigation/tests; remove the entire `frontend/demo/`, static Vite Pages config, demo authentication and fake fixtures, and demo-only CI workflow. Preserve genuine Backend school-import preview.

## SQL and migration safety

1. New migration executes a scoped UPDATE to populate empty `sales_contract_items.description` from the catalog name before removing the catalog FK/index/column and table. Existing line-item prices, quantities and amounts are never rewritten by this migration.
2. MySQL DDL implicitly commits and is not fully atomic. Back up non-disposable DBs; inventory catalog usage and contract item descriptions first.
3. No destructive script has been executed against production, staging or a shared database.
4. Earlier migration history remains present, including initial catalog creation followed by retirement in the latest migration; do not delete migration files merely because a later migration removes their schema objects.
5. Re-export the standalone `kidsfit_crm_schema.sql` after validation; previously generated SQL artifacts may not reflect the new migration.

## Validation and review gate

- GitHub Actions on the feature branch executes .NET unit and MySQL 8.4 integration tests, Frontend unit and source-boundary tests, lint, TypeScript, Vinext build, route tests and Windows routes. Static Pages build and browser-demo smoke no longer exist.
- Do not mark **PASS** unless workflow completed successfully against the exact final head SHA.
- Confirm catalog retirement on a disposable DB with both empty and populated legacy item descriptions and amounts.
- Validate backend authentication and RBAC for Admin, Director, Accounting, Sales Manager, CSKH, CHECKEE and Sales/CTV in live-mode smoke tests.
- Review the full API caller inventory and remove only proven-unreferenced routes/components; avoid speculative drops.
- **Do not auto-merge**. PR may be Ready for review only after checks on its final SHA pass; independent human review of the destructive migration is required.

## Explicitly retained

Disposable MySQL test fixtures and the Backend `InitialCrmSeeder` remain. They are not production mock APIs. Historic frontend routes stay addressable through canonical aliases. The Excel import *preview* remains a real Backend validation step, not a UI demo.
