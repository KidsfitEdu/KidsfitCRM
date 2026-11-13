# KIDSFIT CRM — Frontend (Real API Only)

Production uses React 19 / TypeScript / Vinext, and authenticates solely against the ASP.NET Core API connected to MySQL 8.4. **There is no static demo, demo login, mock API fallback, or GitHub Pages deployment.**

## Requirements

- Node.js >= 22.13.0 and npm.
- Running KIDSFIT CRM Backend, its MySQL database, and valid server-side JWT/authorization settings.
- `NEXT_PUBLIC_API_URL` must point to the Backend `/api` base URL.

## Local development (PowerShell)

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Set `frontend/.env.local` to:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Open http://localhost:3000 and sign in with a **real Backend user account**. If `NEXT_PUBLIC_API_URL` is missing, the UI displays a configuration error. If the Backend is unavailable, the UI displays a connection/error state and retry action. The application never switches to fictional customers.

`NEXT_PUBLIC_*` values are exposed in the browser bundle. Do **not** put JWT signing keys, MySQL connection strings, passwords or secrets in them.

## Architecture

- `src/app/page.tsx` → `src/components/crm/crm-app.tsx` is the single application entrypoint.
- `src/app/crm/[view]/page.tsx` maps view URLs to canonical role workspaces.
- `src/screens` contains Admin, Sales Manager, Sales, Director/Board, Accounting, Customer Service and CHECKEE screens. Sales employees/CTV share the same Sales workspace.
- `src/services`, `src/lib/channel-operations.ts` and related API clients use Backend credentials and server-enforced permissions.
- `src/components/crm/school-directory.tsx` and `school-operations.tsx` load their records from the Backend.
- The school import **preview** is a real Backend validation operation before committing an Excel import; it is not a demo mode.

## Validation

```powershell
npm ci
npm run lint
npx tsc --noEmit
npm run test:unit
npm run test:pages
npm run build
```

`test:unit` includes the real-API-only boundary regression. `test:pages` checks the real application's Vinext route/page structure; it does not build a static Pages demo. GitHub Actions additionally run Windows route smoke checks. Backend .NET/MySQL 8.4 integration tests live in `backend/tests` and use an isolated database; synthetic fixture data there is only for tests.

## Deployment

Deploy the built CRM frontend alongside a reachable ASP.NET Core Backend, configure CORS on the Backend for the frontend origin, and set `NEXT_PUBLIC_API_URL` during the build/deployment lifecycle. Do not use a static Pages preview as a substitute for a configured API.

For server and business rules, see [Backend README](../backend/README.md), [CRM functional specification](../docs/requirements/CRM_FUNCTIONAL_SPECIFICATION.md), and [cleanup dependency manifest](../docs/implementation/CLEANUP_DEPENDENCY_MANIFEST.md).
