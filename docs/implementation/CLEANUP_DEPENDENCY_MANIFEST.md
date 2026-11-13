# KIDSFIT CRM — cleanup dependency and removal manifest

Base: `develop` @ `97e614e8ec6fd323bc7c703b3a7f2bf492729fb7`  
Branch: `refactor/cleanup-legacy-crm-20261113`  
Review PR: #128 (Draft)

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
| Static demo customer fixtures | `demoChannelSalesWorkspace` | MOVE to `frontend/demo/channel-sales-fixture.ts` | Only preview and its tests use fictional customer records |
| Static demo school fixtures | `school-demo.ts`, `school-operations-preview.ts` | MOVE to `frontend/demo/*-fixture.ts` | Dynamically imported only on preview branches; live requests use Backend |
| Live login | `CrmApp` | KEEP and isolate | No fallback to demo when `NEXT_PUBLIC_API_URL` missing; demo has explicit `frontend/demo/demo-crm-app.tsx` |
| Sales / Collaborator | 8 obsolete `src/screens/Collaborator` files | MERGE into existing `SalesStaffWorkspace` and `SalesFocusPage` | `sales-navigation.ts` maps legacy collaborator routes; tests verify aliases |
| Retired UI screens | 10 legacy Board / CHECKEE / CustomerCare / Accounting pages | REMOVE | Existing canonical workspaces render other pages; legacy URL redirects preserved |
| Remaining DB entities and API modules | Remaining business tables, worklog, finance, alert workers, RBAC | KEEP | Live permissions/workers/test consumers; lack of a visible screen is not evidence of unused API |

## Source changes

- Backend: `Domain/ChannelSalesEntities.cs`, `Infrastructure/KidsfitDbContext.cs`, EF snapshot, `Features/ChannelSalesActions.cs`, `ManagerContractEndpoints.cs`, `ChannelSalesContracts.cs`, `ChannelSalesEndpoints.cs`, `SchoolEndpoints.cs`, new migration.
- Backend tests: three large MySQL tests rewritten for signed maintenance/setup fee components, service terms and cycle; historical-term repair test explicitly constructs an old contract; seven synthetic seeders moved to test-only fixtures, retaining test scenarios.
- Frontend: `crm-app.tsx`, `demo/main.tsx`, `demo/demo-crm-app.tsx`, `demo/*-fixture.ts`, `school-directory.tsx`, `school-operations.tsx`, `ManagerWorklists.tsx`, Sales and Board navigation/tests; obsolete view files removed.

## SQL and migration safety

1. New migration executes a scoped UPDATE to populate empty `sales_contract_items.description` from the catalog name before removing the catalog FK/index/column and table. Existing line-item prices, quantities and amounts are never rewritten by this migration.
2. MySQL DDL implicitly commits and is not fully atomic. Back up non-disposable DBs; inventory catalog usage and contract item descriptions first.
3. No destructive script has been executed against production, staging or a shared database.
4. Earlier migration history remains present, including initial catalog creation followed by retirement in the latest migration; do not delete migration files merely because a later migration removes their schema objects.
5. Re-export the standalone `kidsfit_crm_schema.sql` after validation; previously generated SQL artifacts may not reflect the new migration.

## Validation and review gate

- GitHub Actions on the feature branch executes .NET unit and MySQL 8.4 integration tests, Frontend lint, TypeScript, static demo tests, Vinext and static Pages build, and Windows routes.
- Do not mark **PASS** unless workflow completed successfully against the exact final head SHA.
- Confirm catalog retirement on a disposable DB with both empty and populated legacy item descriptions and amounts.
- Validate backend authentication and RBAC for Admin, Director, Accounting, Sales Manager, CSKH, CHECKEE and Sales/CTV in live-mode smoke tests.
- Review the full API caller inventory and remove only proven-unreferenced routes/components; avoid speculative drops.
- **Do not auto-merge**. PR remains Draft until all required regression checks pass.

## Explicitly retained

`frontend/demo` static presentation remains because the repo deploys a separate GitHub Pages demo; demo users and fake schools are not live CRM accounts. `frontend/src/lib/demo-auth.ts` and `src/components/crm/demo-access.tsx` remain shared preview-only helpers imported by the demo target, not an automatic live-login fallback. Historic routes stay addressable through canonical aliases.
