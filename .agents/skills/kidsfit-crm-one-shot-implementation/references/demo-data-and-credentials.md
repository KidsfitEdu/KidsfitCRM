# Shared demo credentials, synthetic seeds and dump

**Runtime-only input:** `Seed__DemoPassword` maps to `Seed:DemoPassword` via ASP.NET Core configuration. The exact password selected by the user must be passed into the agent's **local environment or secret store**, not committed into docs, source, README, CI logs, screenshots or the browser bundle.

## Source baseline

`backend/src/KidsfitCRM.Api/Infrastructure/DatabaseSeeder.cs` currently assigns different hardcoded passwords for Admin, Sales, CHECKEE, partner, CTV, Accountant, Board, Manager and Care. Its `EnsureUser` hashes the password only on initial creation; on a disposable demo database, the new implementation must also normalize previously seeded demo users. `CrmScenarioSeeder.cs` adds business scenarios. `frontend/src/lib/demo-auth.ts` supplies *static preview* profiles and is separate from backend JWT login. Do not mistake UI preview credentials for secure backend login.

## Rules

1. One `Seed:DemoPassword` for **all intentional synthetic backend login accounts**, including Admin, Sales, remaining target roles and compatibility demo accounts. Configure through a noncommitted environment secret. Throw a clear error when demo seed enabled but the secret is missing; do not log its value.
2. Hash independently per account with `IPasswordHasher<User>`. No plaintext DB storage and no common raw hash; verify all demo accounts authenticate with the injected password and wrong passwords fail.
3. Re-seed/update passwords **only for explicitly identified demo users on a verified disposable local/test DB**. Never reset real accounts or users merely because email/role looks similar. Production must refuse demo seeding.
4. Idempotent seed: no duplicate users, schools, registrations, contracts, receipts, activities, permission links or payouts; verify second-run counts.
5. The database account password, MySQL root password, and JWT signing key are separate secrets, never equal by assumption to the demo user password.
6. **Migration ≠ seed ≠ dump**. Test `mysqldump` only against independently owned test DB. Treat SQL dumps containing password hashes/PII as sensitive; do not push to Git. Restore into a different disposable database and validate schema, row counts and logins.
7. If the runner cannot access user-supplied secret, implement the mechanism with an ephemeral test-only password and report the exact user-selected credential was NOT_VERIFIED; never hardcode it.
