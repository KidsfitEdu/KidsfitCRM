# CRM implementation gap analysis — current static review

**Inspected:** `develop` at `4e9c99db374c082289608c60573a7894ee375834` (2026-11-21). Static source inspection only: **not** database audit, HTTP integration, or executed test result. Re-check HEAD before implementation. Use [source map](../implementation/CURRENT_SOURCE_MAP.md) and [feature status](../implementation/FEATURE_STATUS_MATRIX.md).

| ID | Source finding | Required target / follow-up | Verification |
| --- | --- | --- | --- |
| GAP-01 Roles | `Infrastructure/InitialCrmSeeder.cs` defines seven target roles; `frontend/src/config/{navigation,role-pages}.ts` still carries compatibility view IDs (Board, Collaborator). | Preserve existing membership/role history and aliases while enforcing approved seven-role presentation and server RBAC. | Permission tests/actual DB records **not run** |
| GAP-02 School claims | School actions/allocation/policies exist in `Features/`. | Both employee Sales and CTV: 10 simultaneous slots, initial 5-day hold and 7-day × 3 approved extensions, concurrency/tenant checks. | Live behavior **not fully verified** |
| GAP-03 Contract grant | School contract, manager and CHECKEE flows exist across `SchoolActions.cs`, `ManagerContractEndpoints.cs` and `ChannelSalesContracts.cs`. | Manager → CHECKEE → authorized KIDSFIT grant. D-12 post-CHECKEE grant actor remains OPEN. | Role/transition integration **not run** |
| GAP-04 Commission | `BoardCommissionPolicyEndpoints.cs` has defaults Sales 25% / Manager 5%; `AccountingPayoutEndpoints.cs` handles payout records. | D-17/D-18, policy version freeze, eligible cash basis, shared Accountant/Director approval; retain historical 30% ledgers. | Financial scenario suite **not run** |
| GAP-05 Runtime seed | `Program.cs` rejects `--seed-demo`; `InitialCrmSeeder.cs` is a guarded initial setup, and test fixtures exist under `backend/tests/.../Fixtures/LegacySeeders/`. | Never describe retired `DatabaseSeeder.cs` or `demo-auth.ts` as live startup. No real/demo fallback in frontend. | Confirmed from source, DB tests **not run** |
| GAP-06 Account security | `AuthFeatures.cs`, `PasswordResetFeatures.cs`, `UserProfileMenu.tsx` and auth migrations implement account flows; PR #170 merged by this snapshot. | Keep snake_case JSON binding, JWT `security_stamp`, validation/error states. Diagnose any 500 from server log, not by guessing migration. | Runtime browser/API **not run** |
| GAP-07 EF model | Local `--migrate` log showed up-to-date migrations **and** pending model changes. | Compare EF model with migration snapshot in an isolated environment; don't create speculative migration. | **OPEN investigation** |
| GAP-08 Docs | Older guidance referred to removed demo source, superseded rates and invalid package scripts. | Keep active docs and skills aligned to the actual HEAD, requirements and CI scripts. | This documentation PR |
| GAP-09 Feature completion | Existing files are not proof of correctly integrated, authorized end-to-end functionality. | Trace route → DTO → permission → action → EF model → UI consumer → tests and evidence. | See feature matrix |

## Discarded stale operational claims
- Removed runtime paths: `backend/src/KidsfitCRM.Api/Infrastructure/DatabaseSeeder.cs`, `frontend/src/lib/demo-auth.ts`.
- Retired commands: `--seed-demo`, `npm run test:demo`, `npm run build:pages`.
- Superseded commission rule: Sales-only 30% is historical, not the new default; don't modify paid ledgers.

## Verification gates
1. Inspect newest HEAD, actual feature scope, route/DTO, tenant restrictions, migration state and tests.
2. Separate **CONFIRMED** (decision), **IMPLEMENTED** (source), **VERIFIED** (tests), **OPEN** (business decision), and **BLOCKED**.
3. Use isolated MySQL for integration, never real/shared DB.
4. From `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run test:pages`, `npm run build`. From root: `dotnet test backend/KidsfitCRM.slnx`. Tests not executed in this documentation review.
