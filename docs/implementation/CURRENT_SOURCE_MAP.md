# KIDSFIT CRM — Current source map (Real API Only)

Feature branch: `refactor/cleanup-legacy-crm-20261113` · PR #128. Verify the final HEAD when using this map after merge.

| Layer | Canonical source | Runtime behavior |
|---|---|---|
| Backend | `backend/src/KidsfitCRM.Api/Program.cs` | ASP.NET Core .NET 10, JWT/RBAC, EF migration startup |
| Database / migrations | `backend/src/KidsfitCRM.Api/Infrastructure/KidsfitDbContext.cs`, `Infrastructure/Migrations/` | MySQL 8.4; new `RemoveLegacyCheckeePackages` migration retires catalog and product_package_id |
| Initial system data | `backend/src/KidsfitCRM.Api/Infrastructure/InitialCrmSeeder.cs` | Explicit Development-only `--migrate --seed-initial` bootstrap with opt-in flags |
| Tests / synthetic fixtures | `backend/tests/KidsfitCRM.Api.Tests/`, `Fixtures/LegacySeeders/` | Only disposable test MySQL; not linked to production API bootstrap |
| Production frontend entrypoint | `frontend/src/app/page.tsx` → `src/components/crm/crm-app.tsx` | Single real API login and runtime; `NEXT_PUBLIC_API_URL` required |
| Deep-link routing | `frontend/src/app/crm/[view]/page.tsx`, `src/config/routes.ts` | Canonical routes retain appropriate legacy aliases |
| Role screens | `frontend/src/screens/{Admin,SalesManager,SalesStaff,Board,Accounting,CustomerCare,Checkee,Auth}/` | Seven business roles; Sales employees and CTV share SalesStaff UI |
| API/UI services | `frontend/src/services/`, `frontend/src/lib/channel-operations.ts` | JWT-authorized Backend calls; no mock response fallback |
| School operations | `frontend/src/components/crm/school-directory.tsx`, `school-operations.tsx`, `src/components/roles/ManagerWorklists.tsx` | Server data; real Excel import *preview and commit* remains supported |
| Shared UI and styles | `frontend/src/components/common/`, `components/layout/`, `src/app/globals.css` | Unified common UI; no demo entrypoint |
| Frontend validation | `frontend/tests/`, `.github/workflows/frontend-refactor.yml` | Unit, route tests, lint, TS, build, Windows route checks; real API only boundary assertions |

## Retired artifacts

`frontend/demo/`, `frontend/vite.pages.config.ts`, `frontend/src/lib/demo-auth.ts`, `frontend/src/components/crm/demo-access.tsx`, demo-mode environment switch, static GitHub Pages demo workflow, public fake accounts and web fixture fallbacks have been deleted. Do not restore them as substitutes for unavailable Backend data.

## Runtime safety

- If `NEXT_PUBLIC_API_URL` is absent, show configuration error. For failed Backend requests, show error/retry, never fake data.
- Keep audit, signed contract fees, historical receipts, commissions, payouts and protection history unchanged.
- On a non-disposable DB, back up and audit legacy CHECKEE catalog data before applying migration `20261113230000_RemoveLegacyCheckeePackages`; no production DB was changed by this PR.
- `start-local.ps1` provisions an isolated local MySQL server on port 3307 for development. **Review its development-only credentials** before use. It runs migrations without demo seeding.
- `compose.yaml` runs an API migration job with `Seed__DemoEnabled=false` (legacy compatibility setting, no functional demo seeder in production).
- Tests may generate isolated synthetic fixtures to exercise operations, but do not seed them into live CRM.
- Historical migration files must not be edited after application.

See [cleanup dependency manifest](CLEANUP_DEPENDENCY_MANIFEST.md) and [Frontend Real API guide](../../frontend/README.md).
