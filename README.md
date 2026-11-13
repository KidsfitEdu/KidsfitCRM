# KIDSFIT CRM

KIDSFIT / CHECKEE CRM for school sales, customer onboarding, protected approach rights, contract verification, renewal, accounting, commission, customer care, and director oversight.

**Runtime:** React 19 + TypeScript/Vinext frontend → ASP.NET Core .NET 10 API (JWT/RBAC) → MySQL 8.4. The frontend operates in **Real API Only** mode; no static demo, public demo accounts, or mock-data fallback.

## Repository

- [Frontend guide](frontend/README.md)
- [Backend guide](backend/README.md)
- [Business specification](docs/requirements/CRM_FUNCTIONAL_SPECIFICATION.md)
- [Architecture and source map](docs/implementation/CURRENT_SOURCE_MAP.md)
- [Cleanup removal manifest](docs/implementation/CLEANUP_DEPENDENCY_MANIFEST.md)

The seven business roles are **Admin, Director (BGĐ), Accountant, Sales Manager, Customer Service, CHECKEE and Sales** (employees and external CTV share the Sales workflow, subject to membership/organization permissions).

## Run locally

Prerequisites: .NET 10 SDK, Node.js >= 22.13, MySQL 8.4, and configured database credentials/JWT environment variables.

From the repository root on a Windows development machine:

```powershell
.\start-local.ps1
```

The local startup script provisions a **separate development database** on port 3307. Review its local-only database credential settings before running. **Never run it against a shared or production MySQL instance.** It migrates the database but does not seed fictional CRM records or create demo accounts.

Alternatively, start Backend and Frontend separately. Configure the API's MySQL connection, JWT and CORS according to `backend/README.md`, then:

```powershell
cd backend
dotnet run --project src/KidsfitCRM.Api -- --migrate
dotnet run --project src/KidsfitCRM.Api
```

In another terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm run dev
```

Open http://localhost:3000 and log in using an account provisioned by the Backend / controlled initial bootstrap. No public demo password is accepted by the frontend.

## Current business model

- School directory, import preview and commit, main school and branches, proposal review and allocation.
- Five-day approach reservation, capacity restrictions, extensions, conflict protection, team handover.
- Signed school contracts with **manually entered service/setup fees**, verification by CHECKEE, customer protection and renewal.
- Service interruption and expiry notifications, customer care, financial receipts, refunds, commission ledger and board approval of payouts.
- Scoped authorization by role and organization; financial/audit history is preserved.

The retired CHECKEE package catalog is removed by migration `20261113230000_RemoveLegacyCheckeePackages`. Back up and audit any existing non-disposable database before applying a destructive migration; do not import a fresh-database SQL dump into an existing production database.

## Tests and quality gates

```powershell
dotnet test backend/KidsfitCRM.slnx
cd frontend
npm run lint
npx tsc --noEmit
npm run test:unit
npm run test:pages
npm run build
```

MySQL integration tests require an isolated MySQL 8.4 test database. GitHub Actions validate EF migrations, .NET business logic, frontend build/route checks, and commission workflows. The test suite may create **synthetic test fixtures in a disposable database**; these are not a frontend demo or production seed.

See [development instructions](AGENTS.md) for repo conventions and branch/PR workflow.
