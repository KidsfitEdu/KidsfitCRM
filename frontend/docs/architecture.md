# Frontend architecture — Vinext + role pages (incremental)

Source branch: `develop` at `5bd9e553`. This document describes a **migration in progress**, not completed functionality.

## Requirements authority

Read `docs/README.md`, `docs/requirements/DECISION_LOG.md`,
`CRM_FUNCTIONAL_SPECIFICATION.md`, `BUSINESS_RULES.md`, and
`ROLES_AND_PERMISSIONS.md` before changing product behavior.
The **seven target business roles** are distinct from eight **UI page groups**:
`Admin`, `SalesManager`, `SalesStaff`, `Collaborator`, `Board`,
`Accounting`, `CustomerCare`, `Checkee`. SalesStaff and Collaborator map
to one Sales business role with membership/type distinctions. Existing database
role codes and demo profiles must remain compatible until a separate,
reviewed permission migration.

## Target directory ownership

```text
frontend/
  app/                      Vinext route entries, root layout and metadata
  public/                   public-safe icons, branding and assets
  src/
    pages/
      Admin/{Dashboard,Schools,Proposals,Personnel,Capacities,Policies,Reports}/
      SalesManager/ SalesStaff/ Collaborator/ Board/ Accounting/
      CustomerCare/ Checkee/ Auth/
    components/
      layout/               AppShell, Header, Sidebar
      common/               reusable tables, filters, pagination, statuses, actions
      admin/ schools/ proposals/ contracts/ ui/
    services/               transport and typed business API requests
    hooks/                  queries, mutations, forms and client-only hooks
    providers/              session-scoped QueryClient, auth providers
    config/                 navigation, permissions, constants
    types/                  shared typed API/domain contracts
    styles/                 global variables, Tailwind theme
  tests/
```

Do **not** replace Vinext with React Router; `app/` owns actual URLs.
Do not change `vite.pages.config.ts`, static demo setup, MySQL contracts,
financial history, customer ownership, UI copy or role capabilities merely to
match the new folder names.

## Current changes

- `src/config/navigation.ts` moves existing view IDs, menu labels and copy.
- `src/services/api.client.ts` moves the original `request` adapter without
  changing its response/error behavior.
- `src/pages/Auth/Login/LoginPage.tsx` moves the existing login screen.
- `src/pages/Admin/Capacities/CapacitiesPage.tsx` owns the capacity screen;
  the previous import path re-exports the page until consumers move.
- `src/components/common/admin-list-ui.tsx` owns admin list primitives,
  with a compatible legacy barrel.
- All seven Admin pages now contain their own presentation, local form state, data loading and actions; the old `AdminWorkspace` is a compatibility switch that chooses a page and supplies the existing QueryClient.
- CI passed for the Phase-4 interim commit on 30 Oct 2026 (lint, tsc, demo tests, Vinext build, Vite build, Pages artifact tests). This is compilation-level validation, **not** API integration or browser parity sign-off.

## Stage 3–4 implementation status

- Six role page groups (`Board`, `Accounting`, `CustomerCare`, `SalesStaff`, `Checkee`, `Collaborator`) contain 33 presentation-page entries; `SalesManager` has six additional page entries. Shared dashboards and operations panels remain in `src/components/roles/`, preserving the existing backend permission and panel mapping.
- The former role workspaces now re-export their new `src/pages/<Role>/` counterparts for compatibility; `CrmApp` remains the state/session controller until the auth extraction is complete.
- `src/components/layout/Sidebar.tsx`, `Header.tsx`, `AppShell.tsx` own the surrounding UI and preserve the original CSS classes.
- `src/providers/AppProviders.tsx` owns one React Query cache for each signed-in workspace, keyed by token/demo profile. Role workspaces no longer construct their own query clients.
- `src/config/routes.ts` and Vinext `app/crm/[view]/page.tsx` provide optional canonical deep links. Menu navigation uses browser history only with a configured real API; the static GitHub Pages demo remains root-only.
- The route is checked against known view identifiers. **Frontend view checks are not a substitute for backend RBAC**. A user with a URL outside their visible navigation is still restricted to their allowed UI. Server-side permissions must continue to enforce all data access/actions.
- Browser-based checks of real authenticated deep links, refresh/back, session expiry, screen-reader navigation, visual parity and cross-role data isolation have **not been completed**. Do not mark this phase production-accepted solely because CI is green.

## Planned migration and verification

1. Validate existing `develop` lint/tsc/build/test baseline and distinguish
   pre-existing failures from migration regressions.
2. Add navigation/permission parity tests and extract shared AppShell,
   sidebar/header and auth session without changing visible UI.
3. **Extracted (not signed off):** Admin page JSX, state, effects and mutations have moved out of `AdminWorkspace`. Add regression tests and verify API / dialog parity before marking this phase complete.
4. Move each other role's visible page into `src/pages/<Role>/`; share
   services and hooks instead of duplicating finance/contract actions.
5. Consolidate React Query providers with auth/organization-scoped query
   keys; verify sign-out clears sensitive cached data.
6. Introduce explicit Vinext URLs, including unauthorized and deep-link
   checks, while preserving the current menu/view behavior.
7. Preserve education-center screens (leads, parents, students, classes,
   finance), and eliminate old imports only when unused.

Required checks: `npm ci`, `npm run lint`, `npx tsc --noEmit`,
`npm run test:demo`, `npm run build`, `npm run build:pages`,
`npm run test:pages`. Additionally exercise all current demo profiles,
the real API role scopes, Admin CRUD/pagination, mobile sidebar, light/dark,
expired session and contract/finance actions.

No policy changes here: initial 5-day approach, approved 7-day extensions
(max 3), organization-scoped permissions, direct Manager→CHECKEE
verification, five-year protection grant actor OPEN and provisional 30%
commission stay governed by their own separate product decisions.
