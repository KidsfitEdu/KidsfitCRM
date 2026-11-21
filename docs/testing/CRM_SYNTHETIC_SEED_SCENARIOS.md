# CRM synthetic testing scenarios — current guidance

**Updated against source:** `develop` at `4e9c99db374c082289608c60573a7894ee375834` (2026-11-21). Former demo-bootstrapping instructions were deleted because the live application no longer supports them.

## Do not use retired demo startup
- `Program.cs` explicitly rejects `--seed-demo` and `Seed:DemoEnabled`.
- Do not use old `DatabaseSeeder.cs`, `CrmScenarioSeeder.cs` or `frontend/src/lib/demo-auth.ts` as runtime entrypoints; they are absent from current application source.
- `--migrate --seed-initial` is an **initial configuration bootstrap** via `InitialCrmSeeder.cs`, permitted only in explicitly disposable Development with private `Seed:AdminPassword`. It is **not** a scenario seed for schools, customers, contracts or finance.
- Current synthetic fixtures belong to `backend/tests/KidsfitCRM.Api.Tests/Fixtures/LegacySeeders/` and must be run only against separately owned disposable test MySQL.

## Scenario coverage to verify through tests
| Scenario | Expected assertion |
| --- | --- |
| School proposals | Manager review/forward, Admin canonical decision, no duplicate school |
| School claims | Initial 5 days, 10 concurrent slots, self-register + allocated slots, different Sales conflict |
| Extension | Evidence and Manager permission, 7-day × max 3, expiry returns available school |
| Contract verification | Sales → Manager → CHECKEE; no unauthorized automatic long-term grant |
| Renewal and interruption | Annual contract re-signing, confirmed service gap and 12-month interruption |
| Financial | D-17 policy version 25%/5% and overrides, receipt/refund ledger and historical freeze |
| Payout | D-18 Accountant/Director action and immutable approved/paid records |
| Account security | snake_case HTTP JSON, 422/401/429/5xx paths, JWT revocation |
| CSKH / organization | Case scope, handover, alerts, no cross-partner PII |

## Isolation and evidence
Use `dotnet test backend/KidsfitCRM.slnx` for the standard solution. Database integration tests require an isolated MySQL 8.4 instance. Check environment/connection string and scripts before running them. Do not use production or shared DB, or write secrets/password hashes/PII into fixtures, dumps, screenshots or docs.

Record actual source SHA, test command, test database isolation, result, failures and skipped tests. This document lists **planned assertions**, not an executed test report.
