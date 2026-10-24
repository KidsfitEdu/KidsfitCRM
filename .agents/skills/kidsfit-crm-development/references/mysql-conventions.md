# KidsfitCRM MySQL conventions

Read this reference for any database configuration, schema, migration, query, transaction, data import/export, or database-test task.

## Contents

- Production baseline
- .NET connection and supporting drivers
- Character set and collation
- Data type mapping
- Keys, constraints, and indexes
- Transactions and concurrency
- Query portability
- Migrations and data conversion
- Testing and operations

## Production baseline

Use:

```text
MySQL 8.4 LTS
InnoDB
utf8mb4
strict SQL mode
UTC database/application connection timezone
```

- Pin the MySQL `8.4` LTS series in development, CI, and production. Do not use a floating `latest` image.
- Use InnoDB for all persistent CRM tables so transactions, row locking, crash recovery, and foreign keys are available.
- Enable strict SQL behavior and `NO_ENGINE_SUBSTITUTION`. Invalid or truncated data must fail rather than being silently coerced.
- Use lower-case `snake_case` table and column names consistently. This avoids operating-system differences in MySQL table-name casing.
- Configure ASP.NET Core through `ConnectionStrings__MySql` and EF Core's `MySql.EntityFrameworkCore` provider. Do not add a database abstraction layer that merely duplicates `DbContext`.

Baseline environment keys when application configuration is created:

```dotenv
ConnectionStrings__MySql=Server=mysql;Port=3306;Database=kidsfit_crm;User=kidsfit_crm;Password=<secret>;Character Set=utf8mb4;
```

The host value varies by local, CI, and production environments. Never commit real credentials.

## .NET connection and supporting drivers

- Keep ASP.NET Core .NET 10, EF Core 10, `MySql.EntityFrameworkCore`, framework migrations, JWT Bearer, typed DTOs, and the REST API as the backend baseline.
- Run schema migrations as an explicit deployment/startup job before the API accepts traffic; do not let every application replica race to migrate.
- If background jobs become necessary, use a durable provider with explicit retry, failure, and monitoring behavior. Do not silently turn MySQL into a queue or session store.
- Do not use MySQL as a general-purpose cache merely because it is available. Use the local/file cache for simple single-instance development and introduce Redis when shared low-latency cache, high queue throughput, rate limiting, or realtime fan-out is required.
- Background workers and scheduled commands are separate processes and require their own health/operations story.

## Character set and collation

- Set server, database, connection, and table character set to `utf8mb4`; never use the ambiguous/deprecated MySQL `utf8` alias.
- Use `utf8mb4_0900_ai_ci` as the general default for human-readable CRM text unless representative Vietnamese search/sort tests justify a language-tailored collation.
- Consider `utf8mb4_vi_0900_ai_ci` for Vietnamese name/title columns when Vietnamese linguistic ordering is a product requirement. Test actual names before adopting it broadly.
- Use an accent-sensitive/case-sensitive or binary collation for opaque codes, idempotency keys, hashes, provider references, and security tokens where byte-level distinction is required.
- Do not put a case/accent-insensitive unique constraint on human names. A collation that helps search may treat distinct spellings as equal.
- Normalize phone and email search values in dedicated columns when matching rules require behavior different from the display collation.
- Make collation choices explicit in migrations that rely on uniqueness or comparison behavior. Do not depend accidentally on a developer machine's server default.

## Data type mapping

Choose types deliberately:

| Domain value | MySQL baseline |
| --- | --- |
| Numeric primary/foreign key | `BIGINT UNSIGNED`; referenced and referencing columns must match signedness and width |
| Stable short code/status/permission | Length-bounded `VARCHAR` plus application enum/catalog; avoid MySQL `ENUM` for frequently evolving workflows |
| Human name, email, phone, reference code | Length-bounded `VARCHAR` with a deliberate collation and normalized search value where needed |
| Long notes/descriptions | `TEXT`/`MEDIUMTEXT` according to a demonstrated size requirement |
| VND-only amount stored as whole dong | Signed `BIGINT` or `DECIMAL(19,0)`; choose one representation project-wide |
| Multi-currency/fractional amount | `DECIMAL(19,4)` plus an ISO currency code; round only at defined business boundaries |
| Quantity/rate | `DECIMAL` with scale derived from the business rule, never `FLOAT`/`DOUBLE` for authoritative money |
| Date of birth or class date | `DATE` |
| Recurring local schedule time | `TIME` plus explicit center timezone context |
| Business instant | `DATETIME(6)` in UTC when broad range/microsecond precision matters; convert at the presentation boundary |
| Boolean | .NET `bool`, represented by MySQL `TINYINT(1)` semantics |
| Audit before/after or provider payload | Native `JSON`, only for genuinely variable structure |
| IP address | Validated `VARCHAR(45)` or packed `VARBINARY(16)` through one shared converter |

Rules:

- Never use `FLOAT` or `DOUBLE` for tuition, invoices, discounts, payments, balances, or refunds.
- Keep `original_fee`, `discount_amount`, `final_fee`, invoice totals, paid totals, and remaining totals in the same money representation.
- Treat JSON as structured supplemental data, not as a replacement for normal relations, foreign keys, or frequently filtered columns.
- Promote frequently queried JSON properties into typed/indexed columns. Use generated columns only when their lifecycle and migration behavior are tested on MySQL.
- Use `DATE` for birthdays; do not manufacture midnight UTC instants for date-only facts.
- Store application instants in UTC and set the database connection timezone explicitly. Class schedules remain local schedule facts.

## Keys, constraints, and indexes

- Define a primary key for every table. Use one project-wide identifier strategy; EF Core `long` identity keys mapped consistently to MySQL `BIGINT` are the current baseline.
- Foreign-key column type, unsignedness, and collation must match the referenced column exactly where relevant.
- Add foreign keys for fixed relations and choose `RESTRICT`, `CASCADE`, or `SET NULL` from domain ownership—not convenience.
- Default to `RESTRICT` for guardians, students, enrollments, invoices, payments, and audit history. Never cascade-delete financial or audit records.
- Cascading a pure ownership child such as an invoice item may be acceptable when the parent itself can only be deleted before issuance and that rule is enforced.
- Give internal codes and external idempotency/provider references explicit unique indexes. Do not assume phone numbers, emails, or student names are globally unique unless the product defines that rule.
- Design composite indexes from actual predicates and ordering. Put equality columns before range/order columns when it matches the query shape, then verify with `EXPLAIN`.
- Remember that one composite index does not optimize every subset or reversed ordering. Avoid speculative indexes and redundant left-prefix indexes.
- Keep indexed strings reasonably bounded under `utf8mb4`. Do not index large `TEXT` fields as if MySQL supported unrestricted relational keys on them.
- Name constraints and indexes deterministically and keep names within MySQL's identifier limit.
- Use simple database `CHECK` constraints for local arithmetic/range invariants when helpful, while retaining application validation and tests.

## Transactions and concurrency

- Wrap lead conversion, enrollment/capacity allocation, invoice aggregate updates, and payment recording in explicit EF Core database transaction boundaries.
- Lock the smallest authoritative rows with MySQL `SELECT ... FOR UPDATE` inside the transaction before deciding whether a lead was converted, a class has capacity, or an invoice has a remaining balance.
- Acquire locks in a consistent order across use cases to reduce deadlocks.
- Keep transactions short. Do not call email, Zalo, SMS, object storage, HTTP providers, or long-running computations while locks are held.
- Write the business state, activity/audit records, and an outbox record in the transaction when durable event delivery is required. Dispatch external side effects after commit.
- Deadlocks and lock timeouts are normal concurrency outcomes. Use bounded retries only for idempotent actions and preserve the original idempotency key across attempts.
- Enforce uniqueness in the database even when an application pre-check improves error messages; the pre-check alone is race-prone.
- Recalculate invoice aggregates from locked authoritative payment rows or update them under the same lock. Never trust a browser-supplied balance.

## Query portability

Prefer EF Core LINQ and typed projections. When raw SQL is justified for locking or a verified query need, parameterize it and test MySQL SQL explicitly.

Do not carry PostgreSQL-specific constructs into this project, including:

```text
JSONB
ILIKE
array column types/operators
partial indexes with WHERE predicates
PostgreSQL ENUM types
sequences or nextval()
::type casts
ON CONFLICT
RETURNING assumptions
DISTINCT ON
FILTER clauses
```

Use MySQL-compatible behavior instead:

- Use native `JSON` and EF Core/provider JSON query support where verified; test generated paths and indexes on MySQL.
- Use an intentional collation plus `LIKE` for simple case/accent-insensitive matching. Escape wildcard input and avoid leading-wildcard scans on large tables.
- Use normal relation tables rather than array columns.
- Model filtered uniqueness with a domain-specific schema strategy and tests; MySQL has no PostgreSQL-style partial indexes.
- Use EF Core upsert extensions or raw MySQL upserts only with real primary/unique indexes and test conflict-key behavior.
- Retrieve inserted entities through EF Core-generated identity values or a follow-up query rather than assuming PostgreSQL-style `RETURNING`.
- Use `EXPLAIN`/`EXPLAIN ANALYZE` on representative data before adding query hints or denormalized projections.

## Migrations and data conversion

- New migrations must run on MySQL 8.4 from an empty database and upgrade an existing populated database safely.
- Prefer additive deployment steps: add nullable/defaulted structure, deploy compatible code, backfill in bounded batches, then enforce required constraints.
- Avoid long blocking table rewrites in ordinary deploys. Assess MySQL online/in-place DDL support and production table size before altering large tables.
- Keep data backfills resumable and idempotent. Do not mix an unbounded data migration into a schema migration that runs during every deployment.
- If PostgreSQL data is introduced later, migrate through an explicit ETL/import process. Map booleans, JSONB, arrays, enums, sequences, timestamps, collations, and exact numerics deliberately; do not pipe a PostgreSQL dump into MySQL.
- Before a database-engine migration, capture row counts and financial/control totals. After import, verify counts, relationships, sampled records, invoice/payment totals, status distributions, and duplicate/constraint exceptions before cutover.
- Treat rollback from an engine migration as a cutover plan with a write freeze or replication strategy, not merely a down migration.

## Testing and operations

- Run database integration and feature tests against MySQL 8.4 in local/CI containers. Do not rely on SQLite for migrations, collation, JSON, foreign keys, locking, deadlocks, or transaction semantics.
- Test Vietnamese names with accents, decomposed/composed Unicode, case differences, trailing spaces, and representative search expectations before finalizing collation-dependent uniqueness.
- Test conversion/payment idempotency with concurrent requests and verify that only one authoritative record set is created.
- Test foreign-key delete/update behavior and migration upgrades with realistic existing rows.
- Keep strict SQL mode enabled in tests so invalid production data does not pass only in CI.
- Pin development, CI, and production to the same MySQL LTS series and record deliberate `sql_mode`, charset, collation, and timezone settings.
- Add readiness/health checks before the application accepts traffic. Run migrations as an explicit deployment step, not implicitly from the database container startup command.
- Back up both schema and data, encrypt backups, and regularly verify restoration. For InnoDB logical backups, use transaction-consistent options and avoid claiming recovery readiness until a restore test succeeds.
