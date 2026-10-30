# Phase 1 — MySQL 8.4 safety and migration inventory

**Branch:** `audit/phase-1-db-integrity-20261030` from `develop` @ `dfb7d67dc9e3e9988b2ac10c620882f5f0c5e762`. **Scope:** schema audit, legacy compatibility plan, disposable test CI, no production connection.

## Safety boundaries

- `Program.cs` runs `Database.MigrateAsync()` **only** with `--migrate`; `--seed-demo` and `Seed:DemoEnabled` are separate triggers. `start-local.ps1` and `compose.yaml` are not read-only: do not use either for this gate.
- `backend/test-mysql.ps1` forwards `KIDSFIT_TEST_MYSQL_ADMIN`. `ChannelMySqlFixture` uses that account to create `kidsfit_it_<random GUID>`, runs current EF migrations and synthetic `DatabaseSeeder.SeedAsync` twice, and drops **only its own generated schema**. Never pass production/shared MySQL credentials to this fixture.
- Dedicated GitHub Actions `mysql:8.4` service in `.github/workflows/phase-1-mysql.yml` is isolated to a runner and destroyed with the runner. Its credentials are static, CI-only, and not deployment secrets. The test fixture creates/drops only its own database. Separate backup/restore uses two synthetic-only databases with no CRM personal data.
- No existing migration sources, `DbContext`, domain entities, roles, finance/audit/approach rows, or frontend files are changed in this PR.

## Eight existing migrations — retain in order

| ID | Name | Objects / concerns | Preservation rule |
| --- | --- | --- | --- |
| 20261024013029 | InitialCreate | Education CRM users/roles/permissions, parents, students, courses, class/enrollment, invoices/payment, audit | Never remove existing education tables or role_user history |
| 20261024022837 | AddChannelSales | Organization/membership, customer/protection, sales contracts, reconciliation, finance | Preserve ownership, contracts and existing role data |
| 20261024025909 | CompleteChannelSalesOperations | Completes operations, commission/receipt/payout support | Preserve settled/append records |
| 20261024030922 | AppendCommissionCorrections | Commission correction journal | Append/reversal rather than destructive recompute |
| 20261024033745 | AddSchoolDirectoryWorkflow | Directory schools, units, import batches and capacity | Preserve canonical school and branch history |
| 20261026154558 | AddSchoolOperations | Proposal, allocation, extension, policy, audit/CSKH operations | Keep old ownership and approved policy versions |
| 20261026172337 | AddCommissionPersonnelPolicies | Personnel-type policy and owner snapshots | Preserve versioned commission amounts and scope |
| 20261027134500 | AddSchoolProposalRevisions | Versioned proposal revisions with Restricted FKs; Down throws to protect history | Never force rollback; create reviewed forward fix |

The `KidsfitDbContextModelSnapshot.cs` is also preserved. Source-file inventory is **not** proof of the applied `__EFMigrationsHistory` on a populated database.

## Compatibility plan — do not change persisted codes

| Existing role code | Target product view | Required migration discipline |
| --- | --- | --- |
| ADMIN | ADMIN | Keep authorization for administration and existing relations |
| BOARD | DIRECTOR | UI / capabilities alias with KIDSFIT-only scope; do not delete role_user |
| ACCOUNTANT | ACCOUNTANT | Restricted money/reconciliation scopes; no automatic 30% |
| SALES_MANAGER, PARTNER_ADMIN | SALES_MANAGER | Partner vs KIDSFIT organization scope must remain distinct |
| SALES, CHANNEL_SALES, PARTNER_COLLABORATOR | SALES | Same 10-school capacity and both registration/allocation paths after Phase 2 verified changes; retain membership/personnel type |
| CUSTOMER_CARE | CUSTOMER_SERVICE | Alias without erasing support cases/handover records |
| CHECKEE | CHECKEE | Only CHECKEE-approved verification/reconciliation scope |

No new role table migration is currently justified merely to relabel UI. Phase 2 should introduce permission mapping through tested, backward-compatible code. Grant-protection permission owner remains **OPEN**; 30% payout remains **PROVISIONAL**, not a schema default.

## Integrity checks and risk register

- `KidsfitDbContext` maps `role_user` and `permission_role` using composite keys; user/org membership unique key on `(organization_id,user_id)`. These rows must retain IDs and associations.
- Directory school code and customer link are unique; `SchoolUnit` keeps `(directory_school_id,content_hash)` to preserve import identity. Never delete/merge duplicate human names without review.
- Exact money: use MySQL decimal/whole-dong types; keep receipts, refunds, commission policy versions, ledger entries, payouts, payout events and audit separate and append-oriented.
- MySQL uniqueness and `utf8mb4_bin` collations protect idempotency keys and externally defined opaque codes; verify with the existing `MySqlModelTests` and MySQL integration tests.
- The final proposal revision migration has a deliberately non-reversible `Down`; rollback strategy is **forward-fix + verified backup/restore**, not destructive EF Down.
- No new migration required for Phase 1 if current schema and data constraints pass. Phase 2 domain implementation must be considered separately; only introduce additive migration if demonstrably required.

## Quality Gate 1 evidence

| Check | Status | Details |
| --- | --- | --- |
| Source schema/migration review | PASS (static) | Eight migrations and related DbContext/model config inspected from develop HEAD |
| Dedicated MySQL version & isolation | PENDING CI | `mysql:8.4` runner service and explicit version check |
| EF migration application/seed idempotency | PENDING CI | Existing `ChannelMySqlFixture` migrates and seeds twice on random database |
| Full backend transaction/concurrency suite | PENDING CI | `dotnet test backend/KidsfitCRM.slnx --configuration Release` |
| Synthetic mysqldump/restore | PENDING CI | Backup fixture restored to **different** empty schema and row count checked |
| Applied migrations/row counts in operational DB | NOT_RUN | Deliberately prohibited; no production/shared DB access |
| Backward-compatibility migration in production | NOT_RUN | No migration or data edit authorized |

**Gate 1 is PARTIAL until CI completes.** A green CI run proves only disposable/synthetic coverage, not a backup or live inventory of actual customer data.

## Next actions after Gate 1

Review the test logs, record exact PASS/FAIL/SKIPPED counts and fix only faults proved by isolated test runs; keep historical records and migrations unchanged. For Phase 2, implement quota parity for both employee and collaborator Sales with MySQL concurrency and tenant scope tests in a **separate PR**, conditional on reviewed Phase 1 results. Never self-merge.
