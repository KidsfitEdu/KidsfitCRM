# KidsfitCRM frontend architecture — role pages, shared services

Approved direction (30 Oct 2026): use the discoverable folder conventions of
Kidsfit-Web (pages, components, services, hooks, config, types, styles), with
pages grouped by **CRM role**, while retaining Vinext's `app/` file routing,
React/TypeScript, Tailwind, TanStack Query, React Hook Form and Zod.

## Planned layout

```text
frontend/
  app/                      Vinext layout and URL routes (NOT React Router)
  public/                   public images/icons/documents
  src/
    pages/
      Admin/                 Dashboard, Schools, Proposals, Personnel,
        Capacities/          CapacitiesPage.tsx (migrated)
                            Policies, Reports
      SalesManager/          independent screens by menu
      SalesStaff/
      Collaborator/
      Board/
      Accounting/
      CustomerCare/
      Checkee/
      Auth/
    components/
      layout/                AppShell, Header, Sidebar (planned)
      common/                reusable list, table, filter, pagination
      ui/                    UI primitives (planned migration)
    services/
      api.client.ts          request adapter (migrated)
      capacity.service.ts    capacity API transport (migrated)
      auth.service.ts        planned
      school.service.ts      planned
      proposal.service.ts    planned
    hooks/                   query/mutation hooks (planned)
    providers/               app-wide providers (planned)
    config/
      navigation.ts          stable view IDs, nav items and copy (migrated)
      permissions.ts         planned
      constants.ts           planned
    types/                   domain contracts (planned)
    styles/                  shared styling (planned)
  components/                existing source/compatibility during migration
  features/                  temporary compatibility paths from PR #14 phase 1
  lib/                       existing contracts, demos and services
  tests/                     automated regression, API and demo tests
```

## Architectural boundaries

- `app/` owns URL routes and root layout; `src/pages/<Role>/...` owns
  individual role page presentation. Do not introduce `main.tsx`,
  `index.html` or `react-router-dom` without a separate migration decision.
- Shared UI belongs to `src/components/`, reusable API access to
  `src/services/`, and server-data orchestration to `src/hooks/`.
- Do not fork the same business rules for different roles. Share API contracts,
  query hooks and components; each role page controls its own composition.
- `src/config/navigation.ts` contains stable existing view IDs and
  presentation metadata. Do not change permissions or menu behavior while
  relocating code; backend RBAC remains authoritative.
- Retain legacy re-export entrypoints until every caller is migrated and
  automated + manual checks pass.
- The *current* `CrmApp` still owns React-state navigation. URL-based routing
  and AppShell extraction are subsequent steps, not completed in this PR.
- Preserve demo account isolation, data access scope, existing backend/API
  contracts, commission rules and five-day school-approach protection.

## Incremental migration

1. PR CI, shared API request adapter, move Capacities service/page and
   centralized navigation config — **started in PR #14**.
2. Split `CrmApp` into AppShell, authentication/session and role route
   resolution; add tests for navigation and permission gates.
3. Extract seven Admin pages into `src/pages/Admin/`, preserving the current
   validated footer/dialog behavior.
4. Move SalesManager, SalesStaff, Collaborator, Board, Accounting, CustomerCare
   and Checkee screens into role directories.
5. Consolidate QueryClient (scoped per signed-in identity) and domain services.
6. Add Vinext URL routes, preserve existing menu/view semantics, test deep links.
7. Remove compatibility barrels and large workspace files only after the last
   import is gone.

## Quality gates

```sh
cd frontend
npm ci
npm run lint
npx tsc --noEmit
npm run test:demo
npm run build
npm run build:pages
npm run test:pages
```

Review both real API and demo screens for all roles (search, filter, 10/20/50
pagination, page title, action permissions, dialogs, changes, light/dark and
mobile). GitHub PR workflow checks validate compilation but cannot replace
browser-based regression testing.
