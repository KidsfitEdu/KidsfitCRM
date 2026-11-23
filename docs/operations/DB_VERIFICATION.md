# CRM database verification — read-only first

> **DO NOT run on production blindly.** The source and an earlier CI run do not show the state of a privately hosted database. Use a **read-only account** for inspection, redact server addresses and all school/finance/PII data, and record the exact build SHA.

## Evidence to collect

1. Confirm explicit environment, database name, identity, MySQL version, backup owner and whether this is isolated staging or a real/shared DB. Never infer ownership from a configuration flag.
2. In an authorized **read-only** MySQL session (no `DROP`, `TRUNCATE`, `DELETE`, `UPDATE`, DDL or seed), inspect:
   ```sql
   SELECT VERSION() AS mysql_version, DATABASE() AS database_name;
   SELECT MigrationId, ProductVersion
   FROM __EFMigrationsHistory
   ORDER BY MigrationId;
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = DATABASE()
     AND table_name IN ('users','password_reset_challenges','board_commission_policy_versions','payouts','payout_items','payout_events');
   SELECT table_name, column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = DATABASE()
     AND ((table_name = 'users' AND column_name = 'security_stamp')
       OR (table_name = 'board_commission_policy_versions'));
   ```
3. Compare history against `backend/src/KidsfitCRM.Api/Infrastructure/Migrations/` and the tracked `KidsfitDbContextModelSnapshot.cs` at the **same SHA**. A migrated database does **not** imply the model snapshot matches source.
4. Check **pending model changes** on an isolated, disposable copy configured to use the matching current source. Install a compatible dotnet-ef CLI where approved; its `dotnet ef migrations has-pending-model-changes` command is **diagnostic**. Do not issue `migrations add` unless a reviewed actual diff and rollout plan justify it.
5. Verify FK/unique/index integrity, duplicate contract codes, school ownership conflict, pending/paid payout invariants and orphaned records using **reviewed read-only queries** tailored to the real schema. Never change historical paid ledgers to “fix” the audit.
6. Create a separately authorized backup and **restore to a new isolated DB**, then compare schema and aggregate counts without exporting PII into logs or the repository.
7. Mark each gate `PASS / FAIL / NOT RUN / BLOCKED` with redacted evidence. Only after this may an operator approve a migration on the real DB.

## Known gaps

- Fresh MySQL 8.4 migration-twice CI on an earlier commit passed; it cannot attest the real database history.
- Several retired demo-backed synthetic scenarios (10-school quota, NT-01, SL-02, GI-01) remain **NOT RUN** by the newer isolated migration workflow.
- Prior EF `pending model changes` warning is unresolved until a snapshot comparison and isolated reproduction; do not label DB “clear.”
