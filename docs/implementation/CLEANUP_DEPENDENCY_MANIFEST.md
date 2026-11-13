# KIDSFIT CRM — cleanup dependency manifest (work in progress)

Branch: `refactor/cleanup-legacy-crm-20261113` · base: `develop` @ `97e614e8ec6fd323bc7c703b3a7f2bf492729fb7`.

## Rules

- Evidence = static source analysis, **not** database row usage or runtime tests.
- DO NOT merge until Backend build, EF migrations, MySQL 8.4 integration tests, Frontend lint/build/tests, and smoke tests for seven roles pass.
- No production or shared database reset; do not delete real school/contract/payment/audit/ledger history.
- Existing EF migrations remain untouched. New destructive migration must be reviewed for live DB data before execution.

## Dependency classification

| Feature | Database / model | Backend | Frontend | Test dependencies | Status |
|---|---|---|---|---|---|
| Legacy CHECKEE catalog | `checkee_product_packages`, `sales_contract_items.product_package_id` | `ChannelSalesActions`, `ChannelSalesEndpoints`, `SchoolEndpoints` | `channel-sales.ts`, `school-directory.tsx`, legacy preview fixtures | `ChannelSalesMySqlTests`, `SchoolOperationsMySqlTests`, `SchoolWorkflowTests` | **CHANGE IN PROGRESS / TEST MIGRATION REQUIRED** |
| Signed fee entries | `sales_contract_items.description,quantity,unit_price,amount` | Manual maintenance/setup fees | `channel-sales-view.tsx` | Manual-fees tests | KEEP |
| Demo seeders | Synthetic users/schools/contracts | `DatabaseSeeder`, `CrmScenarioSeeder`, `AccountingScenarioSeeder`, `CrmReviewSeeder`, `Nt01DemoSeeder`, `ProtectionRenewalDemoSeeder`, `ServiceInterruptionDemoSeeder` | — | Tests directly invoke DatabaseSeeder and CrmScenarioSeeder | **BLOCKED: refactor test fixtures first** |
| Initial bootstrap | roles, permissions, KIDSFIT/CHECKEE, users, draft policy | `InitialCrmSeeder` called via `--seed-initial` | Live authentication | bootstrap tests | KEEP |
| Static preview | no live DB | `--seed-demo` disabled | `demo-access.tsx`, `demo-auth.ts`, `school-demo.ts`, `school-operations-preview.ts`, `frontend/demo` | demo / Pages preview tests | ISOLATE: only explicit `NEXT_PUBLIC_DEMO_MODE=true` |
| Sales/Collaborator UI | shared SALES role | shared sales endpoints | `SalesStaffWorkspace`, `CollaboratorWorkspace`, `sales-navigation.ts` canonicalizes old URLs | navigation tests | MERGE / KEEP COMPATIBLE URLS UNTIL TESTS |
| Legacy deep links | no DB | no separate API | Board oversight, CHECKEE history/reconciliation/disputes, care handover/followup | route tests | KEEP REDIRECTS UNTIL REFERENCE AUDIT |
| Finance/audit/protection | existing business tables | accounting, background workers, verification | all seven role workflows | integration tests | KEEP |

## Changes made on branch

1. Retire CHECKEE package catalog references in live contract flow, request DTO, EF model and response types; add EF migration removing its column/FK/table. Existing signed item fee details are preserved; blank legacy item descriptions are filled from catalog name where possible.
2. Explicitly gate static preview behind `NEXT_PUBLIC_DEMO_MODE=true`. Missing API configuration must show an error rather than silently open fake CRM.

## Outstanding blockers

- **Integration tests still depend on removed `CheckeeProductPackages` DbSet and positional `ReportSalesContractRequest` old parameter.** Update all call sites to manual fee-based contracts and refactor synthetic fixture setup before considering this branch mergeable.
- **DatabaseSeeder and related demo seeders cannot be removed yet:** the test suite still directly calls them. First introduce independent test factories (no production seed invocation), then remove the legacy classes.
- Migration drops the old catalog: inspect real DB for catalog rows, ensure historical references/metadata are archived where required, and test migration on a disposable MySQL 8.4 instance. MySQL DDL is not fully transactional.
- Other purported unused APIs/components require complete caller search including background workers, tests, and deep-link routing, not just absence from current menu.
- Full build/lint/MySQL verification: **NOT RUN** (no .NET SDK/MySQL/docker or local repo checkout in this execution environment).

## Acceptance gate

- Typecheck/build/test 100%; MySQL migration up on disposable DB with both empty and historical package references; verify historical amounts/contract descriptions unchanged.
- Frontend main mode with unset API fails clearly; preview mode still works only when explicitly enabled.
- Validate Sales, Admin, Director, Accounting, Sales Manager, CSKH, CHECKEE permissions and screens.
- No data loss, no role escalation, no changes to historic migration files.
