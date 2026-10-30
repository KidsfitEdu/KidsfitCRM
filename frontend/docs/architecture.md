# KidsfitCRM frontend — feature-first migration

## Purpose and reference

Kidsfit-Web (`MinhKha28/Kidsfit-Web`, branch `develop`) separates routes,
layout, components, services, types and hooks. KidsfitCRM keeps its current
React 19 + Vinext/Vite + Tailwind + TanStack Query + Zod stack; we reuse the
**module boundaries**, not Kidsfit-Web's SCSS stack or its manual data fetching.

This migration is incremental. The first slice is `features/capacities`.
It moves the existing capacity screen without changing behavior, endpoint,
authorization, data scope or page design.

## Working target

```text
frontend/
  app/                        Vinext route entries, metadata, future providers
  components/
    common/                   stable, domain-independent UI and feedback
    ui/                       accessible design primitives
    crm/                      legacy compatibility screens during migration
  features/
    auth/                     login/session (future)
    schools/                  school listing and details (future)
    proposals/                proposal workflow (future)
    personnel/                team management (future)
    capacities/
      api/capacity-service.ts typed capacity transport
      components/admin-capacity-management.tsx
    policies/                 workflow policy (future)
    contracts/                verification (future)
    commissions/              payments and commission (future)
    reports/                  reporting (future)
  lib/
    api/client.ts             existing CRM API request adapter
    channel-operations.ts     current shared response contracts and query keys
  tests/                      behavior/unit tests and build checks
```

## Dependency direction

- A feature owns its API adapter, types, hooks and page-specific components.
- Features can depend on `components/ui`, `components/common`, `lib/api`
  and shared contracts. Shared UI must not import a feature.
- During migration, old paths may **re-export** new feature components. Remove
  compatibility files only after all importers have moved and CI passes.
- Do not copy business actions into each role. Roles select views/actions
  using permissions, and the backend remains authoritative for authorization.
- Server state should eventually share **one query client per authenticated
  session**, with query keys scoped by identity/organization and invalidation
  on mutations. Existing per-workspace clients remain for now.
- Preserve the public demo, its explicit fake credentials and disconnected
  API behavior. Keep real tokens out of demo fixtures.
- No new API routes, schema changes, finance rules or protection deadlines
  are introduced by a UI architecture migration.

## Migration order

1. Introduce PR CI and keep the original API semantics (this PR).
2. Separate `CrmApp` into session, app shell and view resolution without
   changing the current navigation model. Add route tests first.
3. Move proposal, school directory, personnel and policy screens to
   features with temporary re-export entrypoints.
4. Consolidate the TanStack Query provider and query keys after adding
   multi-role regression tests and token-scoping tests.
5. Introduce URL-based navigation incrementally, retaining old view IDs and
   deep-link behavior as a compatibility mapping.
6. Split large `school-operations` and `channel-operations` views by
   use case, then clean legacy styles only after browser parity checks.

## Quality gates

- `npm ci`, `npm run lint`, `npx tsc --noEmit`
- `npm run test:demo`, `npm run build`, `npm run build:pages`, `npm run test:pages`
- Manual: every role, list/search/page/filters, icon action, dialog,
  edit/approve/deny, real API and demo, responsive/light/dark.
- Never merge with failed checks or without the relevant business regression
  review. GitHub branch protection is a separate repository setting.
