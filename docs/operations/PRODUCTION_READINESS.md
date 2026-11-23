# KIDSFIT CRM — staging / production readiness

**Baseline:** `develop` `989a3ac8200b2b0e37ab0e2fb1bcc658e1d14062` (2026-11-23). This is an operating plan and configuration audit, **not** evidence of deployment or live-database inspection.

## Status / decision

**NO-GO for production customer data** until database integrity, security, environment and seven-role UAT gates are demonstrated. Frontend CI success and an isolated fresh-MySQL migration pass do not certify production. Record actual SHA, environment, operator, timestamp, command, redacted outcome, and rollback evidence for every gate.

| Gate | Current evidence | Required to mark VERIFIED |
| --- | --- | --- |
| Production secrets | Default credentials removed from tracked ASP.NET settings; example Compose requires private env | Inject unique random JWT signing key (>=32 UTF-8 bytes), private MySQL credentials, OTP HMAC key, SMTP secret; rotation/revocation and secret scanning |
| Network | Local Compose restricts host MySQL to 127.0.0.1 only | Host firewall, private DB network, HTTPS proxy/cert, restricted CORS origin and allowed hosts verified from a separate client |
| Frontend serving | `frontend/Dockerfile` remains explicitly **development-only** | Choose and validate a **production** Vinext target, build, smoke-test with an actual backend and document routing, logging and rollback |
| Backend runtime | ASP.NET Core .NET 10 API, JWT, RBAC, rate limiting and `/health` exist | Production config/health, ingress proxy headers, storage mounts, permission/PII tests, audit, rate limiting and error observability |
| Database | Fresh isolated MySQL 8.4 CI migration twice PASS on earlier SHA | Live-target `__EFMigrationsHistory`, model/snapshot diff, schema constraints, zero data-loss dry run and independently restorable backup |
| Domain UAT | Seven target business roles and feature entrypoints in source | Owner-signed 7-role scenario outcomes across schools, claims, contracts, renewals, commissions, payouts, care and alerts |
| Recovery | No production evidence in this review | Restore test on isolated copy and a tested application/DB migration rollback **or forward-fix** plan |

## Backend deployment (operator checklist, not an automatic script)

1. Prepare isolated staging MySQL 8.4 and persistent private evidence storage; **never** point testing, `test-mysql.ps1`, `start-local.ps1`, `--seed-initial` or demo scripts at real/shared/production data.
2. Store `ConnectionStrings__MySql`, `Jwt__Issuer`, `Jwt__Audience`, `Jwt__Key`, `Cors__Origins__0`, `PasswordReset__HmacKey`, SMTP and `Storage__RootPath` using a secrets provider. Never place values in Git, screenshots or build logs. Rotate any placeholders ever used in production.
3. Apply deployment-specific TLS termination and secure forwarded-header trust at a reviewed ingress. Do **not** expose port 3306 publicly. Restrict API to its intended client origins; `AllowedHosts` and reverse proxy routing must be reviewed.
4. Create and verify a **restorable backup** before changing an already populated schema; review the destructive legacy CHECKEE-package migration and preserved financial data. Do not rewrite migrations already applied.
5. From a reviewed artifact, run `--migrate` **only after approval/backup**; application runtime does not auto-migrate or seed. Check `/health`, login/profile, password recovery, evidence upload/download, notification workers and actual permission scopes.
6. Test 401/403/409/422/429/5xx, duplicate submissions, repeated payouts, refund/reversal ledger, concurrency, and partner/school data isolation without real customer payloads in logs.
7. Document monitoring, disk backups for evidence files, DB backups, alerting, certificate renewal, operator access, incident response and rollback/forward-fix.

## Frontend serving decision — not yet implemented

- `frontend/Dockerfile` + root `compose.yaml` run `vinext dev` for **local development only**, NOT production; `frontend/package.json` `start` uses `wrangler dev` (also development).
- Current repo has no reviewed production target configuration. If choosing Cloudflare Workers, follow the **version-compatible Vinext Cloudflare initializer** on a separate reviewed change, configure a staging Worker, set `NEXT_PUBLIC_API_URL` at **build time** to the HTTPS API origin, configure CORS and verify routes on a real deployed Worker. Do not deploy via `npm run dev` or assume `wrangler dev` is production.
- Avoid adding production credentials to `NEXT_PUBLIC_*` variables (public browser bundle). Only operator-approved deploys may use Cloudflare/hosting credentials.

## Data integrity / EF warning

The prior user migration output reported both “No migrations were applied. The database is already up to date” **and** EF Core “pending model changes.” This is an **unresolved model-to-snapshot** question. Do not create speculative migrations or describe the real DB as clean. Follow [read-only DB verification](DB_VERIFICATION.md).

## Release / rollback gates

- P0: secrets and ingress, backup/restore and database model diff, actual RBAC/security/financial HTTP integration on staging, production hosting target and health verified.
- P1: full seven-role UAT and responsive accessibility/visual QA, synthetic concurrency/renewal/commission scenarios in isolated MySQL.
- P2: refactor oversized UI screens and remove legacy development references after dependency review.
- Require explicit product owner/operator production Go/No-Go, a change window, observed rollback trigger, post-release smoke and rollback evidence. **No auto-merge, migration or deploy from this document.**
