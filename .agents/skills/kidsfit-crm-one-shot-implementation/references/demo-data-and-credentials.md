# Test data and initial credentials — current runtime

**Status:** current guidance for `develop` reviewed 2026-11-21. The former one-password-for-all-demo-users instructions were removed because the live app explicitly **disables `--seed-demo`**.

- `backend/src/KidsfitCRM.Api/Program.cs` rejects `--seed-demo` and `Seed:DemoEnabled`.
- `backend/src/KidsfitCRM.Api/Infrastructure/InitialCrmSeeder.cs` permits guarded **initial CRM bootstrap**, not scenario data, with `--migrate --seed-initial` only when environment is Development and `Seed:DisposableDatabase` is true. A private `Seed:AdminPassword` (minimum 12 characters) is required; never write its value to docs, source, logs or PRs.
- Synthetic CRM users, schools, contracts, renewals, receipts and negative cases are **test fixtures** under `backend/tests/KidsfitCRM.Api.Tests/Fixtures/LegacySeeders/` and must run only against isolated, owned, disposable test databases.
- Application login credentials, MySQL accounts and JWT signing secrets are separate. Do not reset any existing account, infer a database is disposable from a config flag, or copy passwords/password hashes/PII into repository dumps.
- Database migration, initial bootstrap, test fixture setup and database backup/restore are different operations. `mysqldump` and restore require explicit test isolation/authorization. Do not run destructive data commands on production/shared DB.
