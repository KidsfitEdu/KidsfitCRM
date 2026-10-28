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

## Coverage still required
This seed is an initial deterministic set, **not exhaustive test coverage**. Additional fixtures and integration tests remain required for duplicate school imports, 10/11/20 capacity transitions, conflicting approaches, invitation accept/decline/expire, policy DRAFT/ACTIVE, extension approval/rejection, contract verification and cancellations, partial/full payment, refunds, commission payout/adjustment, suspended memberships, handovers, tenant isolation and unauthorized API calls. Some negative paths must be exercised by tests rather than persisted inconsistent rows. Do not mark such cases complete without verification.

## Verification
Run `dotnet test` and the project's `backend/test-mysql.ps1` against a disposable MySQL 8.4 test database after confirming connection settings. This branch has not yet been run through local build/database integration checks.
