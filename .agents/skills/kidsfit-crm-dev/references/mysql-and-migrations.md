# MySQL 8.4 + EF Core migrations

Follow actual `.agents/skills/kidsfit-crm-development/references/mysql-conventions.md` from live repo when accessible. Snapshot baseline: MySQL 8.4 LTS, InnoDB, `utf8mb4`, strict mode, EF Core 10 + `MySql.EntityFrameworkCore`, snake_case physical identifiers, UTC business instants and explicit collation.

## Before touching a migration

1. Read current `KidsfitDbContext.cs`, model configurations, current `Infrastructure/Migrations/`, provider package versions, indexes, applied migration history when safely accessible, and affected data volume.
2. Classify change as additive, backfill, renaming/compatibility, or destructive; write impact map and backfill approach.
3. Determine unique constraints and collation carefully: normalized names are not reliable globally unique IDs; opaque idempotency tokens need binary/case-sensitive uniqueness.
4. Identify destination database explicitly. For shared/prod data, require authorized maintenance plan and verified backup/restore; do not run `start-local.ps1`, `compose.yaml`, `--migrate`, or `--seed-demo` blindly.
5. Add new EF Core migration. Never edit/delete a migration already deployed; never reset migration history simply to make a diff smaller.
6. Test against isolated MySQL 8.4 DB with representative populated records, verify FKs/indexes, rollback/forward recovery plan and data preservation. SQLite-only tests do not validate MySQL locking or collation.

## Type and integrity rules

- Keys: match PK/FK signedness and types; use proper FK delete behaviors, prefer RESTRICT for money/audit/customer records.
- Strings: utf8mb4, fit varchar lengths and collation to use case; consider Vietnamese collation only after testing representative names; don't normalize away school distinction.
- VND: project-consistent `DECIMAL(19,0)` or `BIGINT`; never FLOAT/DOUBLE; for fractions/currency use properly scaled DECIMAL plus ISO code.
- Temporal: `DATETIME(6)` UTC for business instant; `DATE` for pure dates; expiry behavior must use one source of truth/timezone.
- Index from query filters and ordering; test `EXPLAIN`, eliminate redundant indexes; be aware of MySQL null/unique behavior.
- Claim concurrency: protect school allocation and quota via transaction and lock/unique invariant; use `SELECT ... FOR UPDATE` as appropriate to existing provider and transaction, verify 2 requests can't both succeed.
- Seed vs migrate vs dump: distinct operations. Demo fixture must be synthetic, opt-in, repeatable and confined to disposable DB; never commit real backups, credentials or PII.

## Commands (illustrative; verify project setup first)

```powershell
# From backend/ after verifying migrations tooling and project paths
dotnet tool restore
dotnet ef migrations add MeaningfulChange --project src/KidsfitCRM.Api --startup-project src/KidsfitCRM.Api --output-dir Infrastructure/Migrations
# Apply only to explicitly authorized isolated DB using reviewed credentials:
dotnet ef database update --project src/KidsfitCRM.Api --startup-project src/KidsfitCRM.Api
```

Do not use these commands without verifying the actual EF tooling startup/environment and migration pattern on current develop. Never promise automatic rollback of irreversible data transformations; plan forward fixes and tested restore instead.