# Giai đoạn 0 — Audit & baseline (read-only)

**Repository:** `KidsfitEdu/KidsfitCRM` · **base:** `develop` @ `f7c4528e1f18e23234c0bf56e9c5170b08764c34` (2026-10-30).
**Branch:** `audit/phase-0-crm-baseline-20261030`. **Status:** PASS for Phase-0 read-only baseline; MySQL integration SKIPPED/BLOCKED for later isolated DB gate. This is a source-level audit; requirements describe targets, not shipped behavior.

## Safety and provenance

Read `AGENTS.md`, `docs/README.md`, both `.agents/skills/*/SKILL.md`, the entire `docs/prompts/MASTER_CRM_IMPLEMENTATION_PROMPT.md`, current requirements, decisions, gap analysis, source map, phased plan, and relevant engineering/MySQL/school/CHECKEE/UI references. Inspected real `develop` HEAD via GitHub tree and exact source, **not** old refactor branch. The GitHub workspace is remote (not a checkout): `git status --short` cannot be obtained here; branch/head/tree were checked remotely, no local uncommitted files overwritten. No database connection, migration, seed, dump, or production action was performed. No source module, existing migration, role row, financial or audit record was changed/deleted.

### Rule → action / API → entity or schema → UI → test → assessed status

| Approved rule / requirement | Current action / API | Entity / migration evidence | UI evidence | Relevant existing tests | Status |
| --- | --- | --- | --- | --- | --- |
| D-01–03, BR-01–02 seven business roles / one Sales employee+CTV; both can register/receive | `DatabaseSeeder.cs` permission bundles and `ChannelSalesAccess.cs` | `KidsfitDbContext.cs` (`role_user`, memberships); `DatabaseSeeder.cs` still seeds `BOARD`, `CHANNEL_SALES`, `PARTNER_ADMIN`, `PARTNER_COLLABORATOR` | `src/screens/SalesStaff/` and `Collaborator/` separate; `src/config/navigation.ts` preserves IDs | `ChannelSalesMySqlTests.cs` partner/scope tests | LEGACY_COMPAT / NEEDS_FIX: alias and capability parity required; preserve existing user memberships |
| BR-03–04 Sales quota default 10, self-registration and accepted allocation, lower quota does not revoke | `SchoolActions.CheckSchoolCapacity`, `ChangeSchoolCapacity`; `SchoolEndpoints.cs` `/school-capacities` | `OrganizationMembership.SchoolApproachLimit`, `SchoolCapacityChange`, `SchoolModelConfiguration.cs`, existing migrations | `src/screens/Admin/Capacities/CapacitiesPage.tsx` | `SchoolWorkflowTests.cs` concurrency/admin quota | NEEDS_FIX (P0): `IsCollaborator` allows employee Sales bypass in both capacity check and change |
| BR-05–07 5 days + 7 days ×3; expiry/new owner protection | `SchoolAllocationActions.RequestSchoolExtension`, `ReviewSchoolExtension` | `SchoolWorkflowPolicyVersion` active policy, `SchoolExtensionRequest`, `ApproachRegistration`; School Operations configuration | `src/screens/Collaborator/Extensions/`, `src/screens/SalesManager/Extensions/` | `SchoolOperationsMySqlTests.cs` draft/active policy, stale owner | PARTIAL: engine supports configured bounds; current active 7×3 policy and fourth-rejection not verified on test DB; pending SLA OPEN |
| BR-08–09 new-school proposals Sales→direct Manager→Admin; duplicate/ownership race | `SchoolProposalActions.SubmitSchoolProposal`, `ReviewSchoolProposal`; `PENDING_MANAGER` → `PENDING_ADMIN` | `SchoolProposal`, `SchoolProposalRevision`, School Operations migration | `src/screens/Admin/Proposals/`, `src/screens/SalesManager/Proposals/` | `SchoolOperationsMySqlTests.cs` manager/admin, duplicate and revision | PARTIAL: source workflow present; scoped concurrency and integration need isolated MySQL execution |
| BR-10–11 activity and pipeline distinct from availability/contract state | ChannelSales activity actions, `ChannelSalesAccess.Customers` | `CustomerActivity`, `ApproachRegistration`, `SalesContract` | `src/screens/SalesStaff/Activities/`, `Collaborator/Approaches/` | `ChannelSalesMySqlTests.cs` scope tests | PARTIAL: code/API exists; field-by-field UI and append-only evidence not independently exercised |
| BR-12–13 Sales→Manager KIDSFIT/partner→CHECKEE→KIDSFIT grant; no automatic 5-year right | `SchoolActions.ReviewSchoolContract`, `GrantSchoolProtection`; `SchoolEndpoints.cs` `/review`, `/grant-protection` | `SalesContract`, `ReconciliationCase`, `CustomerProtection` | `src/screens/Checkee/Verification/`, `SalesManager/` | `SchoolWorkflowTests.cs` contract requires verification; `ChannelSalesMySqlTests.cs` | PARTIAL / BLOCKED_BY_POLICY (O-03): code verifies CHECKEE before grant; KIDSFIT delegated grant actor undecided, do not silently grant to Admin/Director |
| BR-14, BR-15 30% provisional, installments and finance immutable | `ChannelSalesFinanceActions.cs`, `SchoolFinanceActions.cs` | `RevenueReceipt`, `CommissionPolicyVersion`, `CommissionLedgerEntry`, `Payout`, `RevenueRefund` | `src/screens/Accounting/`, `SalesStaff/Income/` | `ChannelSalesMySqlTests.cs` receipts, immutable ledger, concurrency | PARTIAL / BLOCKED_BY_POLICY (O-04): demo policy versions 10%/12% remain; never auto-enable 30% |
| BR-16 no referrer/personal split | No new feature authorized | Do not introduce referrer/split tables | No referrer screen authorized | N/A | VERIFIED as requirement restriction; runtime absence needs exhaustive grep to certify |
| BR-17–18 preserve handover/history, CHECKEE data scope | `SchoolCareActions.cs`, `ChannelSalesAccess.cs` | `ContractCareHandover`, `CustomerSupportCase`, ledger/audit | `src/screens/CustomerCare/`, `Checkee/` | `SchoolOperationsMySqlTests.cs` handover, `ChannelSalesMySqlTests.cs` tenant scope | PARTIAL: historical preservation tests exist but not executed in this audit |
| Legacy education center | `Program.cs`, education-center feature endpoints | `KidsfitDbContext.cs` includes `Parent`, `Student`, `Lead`, `Course`, `ClassRoom`, `Enrollment`, `Invoice`, `Payment` | Legacy navigation IDs remain | `LeadTransitionPolicyTests.cs` | LEGACY_COMPAT: retain modules, migrations and data unchanged |

### Schema/migration inventory

Eight ordered migrations present, including:
1. `20261024013029_InitialCreate`
2. `20261024022837_AddChannelSales`
3. `20261024025909_CompleteChannelSalesOperations`
4. `20261024030922_AppendCommissionCorrections`
5. `20261024033745_AddSchoolDirectoryWorkflow`
6. `20261026154558_AddSchoolOperations`
7. `20261026172337_AddCommissionPersonnelPolicies`
8. `20261027134500_AddSchoolProposalRevisions`

`KidsfitDbContextModelSnapshot.cs` remains present. EF applied migration history of any real DB **NOT_RUN** because no isolated test MySQL has been connected. Counts and migration source list do not prove applied state.

### Test execution & isolation

| Check | Phase-0 baseline result | Reason / gate |
| --- | --- | --- |
| GitHub HEAD and recursive source inventory | PASS | Verified `develop` HEAD `f7c4528...` and non-truncated tree (309 files) |
| Source audit of actions, migrations, roles, test fixture | PASS (static) | Read actual files and relevant source references |
| `git status --short` | NOT_RUN | GitHub remote connector is not a local checkout; no worktree attached |
| `dotnet test backend/KidsfitCRM.slnx` without DB | **PASS CI: 31 passed / 46 skipped / 0 failed** | GitHub Actions run #41020175097; MySQL tests skipped as designed (no `KIDSFIT_TEST_MYSQL_ADMIN`) |
| Frontend `npm ci`, lint, TypeScript, demo tests, Vinext build, Vite Pages build, Pages tests | **PASS CI** | All seven steps succeeded in frontend-no-db job, run #41020175097; no API/database integration asserted |
| MySQL 8.4 DB integration and `backend/test-mysql.ps1` | BLOCKED | `KIDSFIT_TEST_MYSQL_ADMIN` absent and explicitly requires CREATE/DROP on dedicated disposable test DB |
| `start-local.ps1`, `compose.yaml`, `--migrate`, `--seed-demo`, dump | SKIPPED intentionally | Side effects and/or unsafe unless verified independent environment; not needed for Phase 0 |
| Browser visual QA with authenticated API | NOT_RUN | No staging URL or isolated test database; demo UI is not authenticated API evidence |

**Critical test fixture:** `ChannelMySqlFixture` builds a randomized `kidsfit_it_...` DB with `CREATE DATABASE`, runs `MigrateAsync` and `DatabaseSeeder.SeedAsync` twice, then `DROP DATABASE`. It must never receive shared/production administrative credentials. CI baseline workflow omits `KIDSFIT_TEST_MYSQL_ADMIN`; therefore MySQL integration tests will be skipped and reported as such, not misrepresented as passed.

### Prioritized remediation sequence (do not implement in Phase 0)

- **P0 safety:** secure isolated MySQL 8.4, retention/backup/restore and role/tenant permission baseline. Do not edit applied migrations.
- **P0 roles/quota:** 7 business-role compatibility mapping without deleting legacy rows; same 10-slot Sales policy for employee and collaborator including two-school concurrency.
- **P0 extensions:** versioned active policy 5+7×3, explicit fourth-request denial and stale-owner regression.
- **P0 contract/finance fences:** independently confirm Manager→CHECKEE and grant negative paths; defer unresolved post-CHECKEE grant role and provisional 30% activation.
- **P1 workflows/UI:** proposal audit, contract/Care/finance integration and shared Sales UX through compatible adapters.
- **P2 reporting:** responsiveness/accessibility/visual QA, synthetic seed idempotency, test dump/restore evidence and final handoff.

### OPEN decisions / blockers

`O-01` extension day interpretation; `O-02` pending extension SLA; `O-03` authorized KIDSFIT 5-year grant actor; `O-04` 30% commission base, activation and payout; `O-05` main/branch legal coverage; `O-06` manager/Admin SLA; `O-07` cancellation/refund/reversal authority; `O-08` cross-partner delegation. No values/actors are inferred.

### Phase gate

**GATE 0: PASS for read-only source audit and baseline.** Source mapping, risk priority, backend unit tests and frontend CI evidence captured. MySQL integration remains **SKIPPED/BLOCKED**, not PASS; **Gate 1 is NOT STARTED** until an explicitly isolated MySQL 8.4 test endpoint and safety/backup plan are verified. No runtime source, migrations, seed, finance or production records were edited. See [run #41020175097](https://github.com/KidsfitEdu/KidsfitCRM/actions/runs/41020175097). Do not merge automatically.

## Recorded CI evidence — 2026-10-30

GitHub Actions [Phase 0 read-only baseline #41020175097](https://github.com/KidsfitEdu/KidsfitCRM/actions/runs/41020175097): `backend-no-db=success`, `frontend-no-db=success` on commit `73675b74a489d62477fbfb8d8ec343a2a906b3aa` (before this documentation-only evidence update). Backend runner: `dotnet test backend/KidsfitCRM.slnx --configuration Release` → **31 passed / 46 skipped / 0 failed**. The skipped cases are MySQL-gated integration tests or other explicitly optional tests; do **not** describe them as passing. Frontend runner: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run test:demo`, `npm run build`, `npm run build:pages`, `npm run test:pages` all succeeded. This is CI on `ubuntu-latest`, not local Windows or full business E2E. Explicit integration and restore evidence remains NOT_RUN.


## One-shot implementation attempt — 2026-10-30 (separate feature branch)

**Base:** `develop` at `c306249985b9832539e59313d071deb155f0d095`. **Branch:** `feat/crm-one-shot-safe-upgrade-20261030`. This update supersedes the earlier read-only Phase-0 status **for this branch only**; the historical CI numbers above are not tests of these new commits.

### KEEP / FIX / MERGE / REMOVE manifest

| Category | Source/decision | Dependency and safety evidence |
| --- | --- | --- |
| KEEP | All eight existing EF migrations, model snapshot, education entities, payment/commission/audit records | Existing endpoints, relationship graph and tests consume them; no disposable database was verified for destructive migration |
| FIX | `SchoolActions.cs`: school membership quota enforcement | Employee `SALES` previously bypassed `CheckSchoolCapacity`; existing `SALES` and CTV memberships now use a shared 10-slot/default configurable limit |
| FIX | `SchoolEndpoints.cs`: capacity listing | Admin capacity UI calls this endpoint; it now enumerates employee Sales as well as collaborators |
| FIX | `DatabaseSeeder.cs`, local startup, Docker compose | Remove legacy hardcoded backend demo passwords and opt-out implicit seeding; require runtime `Seed:DemoPassword` and `Seed:DisposableDatabase=true`, reject production environment, normalize only specifically identified synthetic accounts |
| FIX | Real-API Login UI | No prefilled legacy backend password; static `frontend/demo` is a different preview-only authentication mode |
| MERGE (deferred) | `SalesStaff` and `Collaborator` screens | Both retain imports/routes and existing API consumers; consolidate only when a replacement UI and smoke coverage exist |
| REMOVE (deferred) | Historical education-center modules | Current `DbContext`, routes and tests still depend on them; none proven dead or safe to delete |

### Phase checkpoints (actual results only)

| Phase | Status | Evidence / blocker |
| --- | --- | --- |
| 0 audit | PARTIAL | Remote `develop` HEAD, source/skills/requirements audited; no local `git status` or fresh baseline test |
| 1 migration | BLOCKED | No dedicated MySQL 8.4 or .NET CLI available in this execution environment. Eight migrations **preserved**; no schema change attempted |
| 2 roles/quota | PARTIAL | Targeted backend quota fix and new MySQL-gated employee regression test **committed**, not executed |
| 3 proposals/extensions | NOT_RUN | Existing implementation preserved; no new integration evidence |
| 4 CHECKEE grant | POLICY_BLOCKED | Final KIDSFIT grant actor OPEN; no new automated authority |
| 5 finance/CSKH | PARTIAL | Existing modules preserved, unapproved 30% not activated; no fresh test |
| 6 frontend | PARTIAL | Removed backend-password autofill, preserved static preview; lint/build/browser smoke **NOT_RUN** |
| 7 seed/dump | PARTIAL / NOT_RUN | Secret-driven backend seed guard implemented; idempotency requires isolated MySQL verification. Actual dump/restore **NOT_RUN** |
| 8 regression | NOT_RUN | `dotnet`, MySQL and dependency-backed frontend verification unavailable locally; CI must be checked on PR |
| 9 handoff | PARTIAL | Branch commits and review PR proposed; completion of full master prompt **not certified** |

**Actual tests executed on this branch:** no .NET, frontend, MySQL, dump/restore or browser tests. **Previous baseline only:** run #41020175097 reported backend 31 PASS/46 SKIP and successful frontend steps on an older commit. Do not attribute those results to this branch.

**OPEN policy fences:** final KIDSFIT 5-year grant actor; extension-pending SLA; main/branch coverage; commission base, activation, payout and refund authority. No real/unknown records or migration history were removed. `Seed__DemoPassword` is intentionally absent from source and test uses only an ephemeral fixture value.
