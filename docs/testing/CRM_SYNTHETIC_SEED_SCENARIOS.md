## Updated acceptance: shared synthetic demo logins (2026-10-30)

For **backend demo accounts only**, opt-in seed shall take a single shared password from runtime configuration `Seed__DemoPassword`, hash it independently for each synthetic user, and verify it for all target-role and deliberately retained compatibility demo accounts on a disposable test database. Re-seed must not duplicate records or reset authentic real users. Frontend static preview identities are separate. The chosen password is intentionally not committed to repository text. Database connection credentials and JWT keys remain independent. See [one-shot credential reference](../../.agents/skills/kidsfit-crm-one-shot-implementation/references/demo-data-and-credentials.md).

> **Historical implementation record.** Current accepted school-sales rules: [requirements](../requirements/CRM_FUNCTIONAL_SPECIFICATION.md), [decision log](../requirements/DECISION_LOG.md). Previously implemented behavior, demo rates and DRAFT policy suggestions below do not supersede these rules.

# CRM synthetic seed scenarios (local/testing only)

This branch extends the existing `--seed-demo` runner and does not run automatically for regular API startup. **Never run demo seeding against production or a database containing real people or commercial records.** Use a fresh disposable MySQL database and the project's explicit migration/seed workflow.

## Run (PowerShell, from backend/)
```powershell
dotnet run --project src/KidsfitCRM.Api -- --migrate --seed-demo
```

## Existing role accounts and records
The existing `DatabaseSeeder` provisions ADMIN, SALES, SALES_MANAGER, BOARD, ACCOUNTANT, CUSTOMER_CARE, CHECKEE, PARTNER_ADMIN, PARTNER_COLLABORATOR and basic customer/contract/receipt/commission/reconciliation records. Use separate disposable credentials; do not deploy the hardcoded demo accounts to production.

## Added test fixtures
| Scenario | Fixture identifier | Expected use |
|---|---|---|
| Partner CTV proposal awaiting manager, past due | SEED-SCH-PENDING | Manager and BGĐ overdue queue |
| Internal sales proposal awaiting Admin | SEED-SCH-ADMIN | Manager → Admin flow |
| Rejected partner proposal | SEED-SCH-REJECT | Rejection/history visibility |
| Pending approach extension | scenario-extension-pending | Manager approval/expiry review |
| Open contract support case | scenario-support-open | CSKH follow-up |

The additional fixtures are idempotent by stable scenario IDs/codes and intentionally contain no genuine contact details.

### Demo-only Admin workflow-policy versions

The explicit `--seed-demo` path adds three **DRAFT** KIDSFIT school-workflow policy records
when their stable `decision_reference` is absent; existing records are not changed.

| Decision reference | Manager review (illustrative) | Admin review | Invitation | Extension | Status |
| --- | ---: | ---: | ---: | --- | --- |
| `DEMO-KIDSFIT-WORKFLOW-24H` | 24 hours | 72 hours | 24 hours | 7 days × up to 3, 21-day total extension | `DRAFT` |
| `DEMO-KIDSFIT-WORKFLOW-48H` | 48 hours | 72 hours | 24 hours | 7 days × up to 3, 21-day total extension | `DRAFT` |
| `DEMO-KIDSFIT-WORKFLOW-72H` | 72 hours | 72 hours | 24 hours | 7 days × up to 3, 21-day total extension | `DRAFT` |

These examples populate **Admin → Quản lý chính sách vận hành** only when the
frontend is connected to the demo backend. They are synthetic data, not authorized
manager-stage/invitation SLAs, and never activate a workflow policy. The normal
72-hour Admin proposal fallback remains unchanged without an active policy.
Versions are assigned after the organization's current maximum; re-running seed
does not overwrite, renumber, or duplicate a matching decision reference.
The static frontend preview remains separate and is not populated by MySQL seeding.
Test via `DemoWorkflowPoliciesAreDraftOnlyIdempotentAndDoNotSetActiveSla` on
an isolated MySQL 8.4 test database.


## Coverage still required
This seed is an initial deterministic set, **not exhaustive test coverage**. Additional fixtures and integration tests remain required for duplicate school imports, 10/11/20 capacity transitions, conflicting approaches, invitation accept/decline/expire, policy DRAFT/ACTIVE, extension approval/rejection, contract verification and cancellations, partial/full payment, refunds, commission payout/adjustment, suspended memberships, handovers, tenant isolation and unauthorized API calls. Some negative paths must be exercised by tests rather than persisted inconsistent rows. Do not mark such cases complete without verification.

## Verification
Run `dotnet test` and the project's `backend/test-mysql.ps1` against a disposable MySQL 8.4 test database after confirming connection settings. This branch has not yet been run through local build/database integration checks.

## PR #25 — existing-database incremental mode (2026-10-30)

The product owner selected **keep the current MySQL database and add missing scenarios** instead of creating a separate v2 database. The incomplete `Seed:Profile=CRM_V2` prototype was removed from this PR. Continue using the existing explicit `--migrate --seed-demo` path only after verifying the database is a disposable **demo** instance; the opt-in `Seed__DisposableDatabase=true` flag is a guard, **not** evidence of actual database ownership.

New source fixtures in `CrmScenarioSeeder.cs` include approved, rejected, and manager-pending school proposals and a resolved support case. Each uses a stable idempotency key or school code and skips insertion if it already exists. Existing original demo fixtures remain for compatibility.

### Existing data inventory before deletion

- **Education CRM**: leads, guardians, students, classes, enrollments, invoices, payments and related rows. Even when unrelated to the new seven-role CRM, there is no validated provenance for the actual database rows. **Do not delete** without verifying demo-only ownership, backups, all foreign keys and affected API consumers.
- **Historical CHECKEE fixtures**: `CUS-DEMO-AVAILABLE`, `CUS-DEMO-APPROACH`, `CUS-DEMO-CONTRACT`, `CHK-2026-0001`, and sample finance entries. These are source-created synthetic identifiers, but an actual database can also contain subsequent user changes and relations. **Do not automatically remove** their customer, registration, contract, reconciliation, receipt or ledger rows.
- **Frontend static preview**: `frontend/src/lib/{crm-data,school-demo,demo-auth}.ts` remains independent of backend data. In connected API mode use `NEXT_PUBLIC_API_URL=http://localhost:8000/api` and do **not** enable `NEXT_PUBLIC_DEMO_MODE=true`; static presentation screens may still reference legacy fixtures.
- **Credentials**: `Seed__DemoPassword` must be provided privately. Never copy the value into fixture source, logs, SQL scripts, or the browser bundle.

### What remains to be completed

1. Take a verified backup of the **current** database, inspect data provenance and complete dependency graph; generate an exact primary-key deletion candidate manifest for review. No destructive SQL was run.
2. Extend scenario coverage for school directory, accepted/rejected allocations, 10/11/20 capacity, 5+7×3 extensions, stale-owner rejection, manager→CHECKEE contract states, receipts, refunds, payouts, handover and scoped read models. Invalid permission and concurrency cases must be asserted in tests rather than planted as inconsistent rows.
3. Migrate frontend API-connected role dashboards away from legacy fixture defaults without modifying the public static preview unintentionally.
4. Execute .NET compilation, isolated MySQL integration, repeat seed, frontend lint/typecheck/build, browser tests and restore verification; record exact results. **These checks have not run in this connector-only environment**.

**Safety result:** No SQL UPDATE/DELETE/DROP was executed, no live MySQL connection established, and neither legacy finance/audit records nor education CRM rows were deleted. PR #25 remains Draft and unmerged.
