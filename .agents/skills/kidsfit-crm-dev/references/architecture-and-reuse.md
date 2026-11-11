# Architecture, directories, reuse

Source-checked against KidsfitCRM `develop` on 2026-11-02; paths are a snapshot, not a guarantee. Reinspect `docs/implementation/CURRENT_SOURCE_MAP.md` every task.

```text
KidsfitCRM/
  AGENTS.md
  docs/requirements/          # approved vs proposed business rules
  docs/implementation/        # source map and gaps
  docs/design/                # UI design system
  frontend/
    src/app/                  # Vinext route handlers and globals.css
    src/screens/              # role/feature presentation
    src/components/common/   # reusable KIDSFIT app UI
    src/components/ui/       # shadcn primitives
    src/components/layout/   # shared shell/header/sidebar
    src/services/            # typed API integration
    src/config/              # routing/navigation/permissions
    src/hooks/               # existing queries/mutations
    tests/
  backend/
    src/KidsfitCRM.Api/
      Program.cs
      Domain/
      Features/              # HTTP endpoints and named business actions
      Infrastructure/
        KidsfitDbContext.cs
        Migrations/
    tests/KidsfitCRM.Api.Tests/
```

Existing frontend page groups include `Admin`, `SalesManager`, `SalesStaff`, `Collaborator`, `Board`, `Accounting`, `CustomerCare`, `Checkee`; these are not the seven target RBAC role codes and must be migrated compatibly rather than blindly deleted.

## Reuse-first protocol

Search for components, route views, API service adapters, validators, formatters, business actions, EF mappings, and tests before adding another abstraction. Reuse an existing primitive if it fits with props/variants; add a focused variant when reasonable. New components must be domain-neutral when reusable and remain within the owner feature when one-off. Do not create generic folders just to store 1 function or duplicate an endpoint for UI convenience.

Avoid shotgun refactoring: preserve existing contracts, deep links, storage, tests, audit and finance. Refactor large action files incrementally only when it improves ownership and tests prove no regression. Keep cross-module orchestration in a named use case, not a UI click handler or incidental controller method.

## KIDSFIT recent Accounting slice — paths to verify

- `frontend/src/screens/Accounting/Revenue/RevenuePage.tsx`: Accounting workspace shell.
- `frontend/src/screens/Accounting/Contracts/AccountingContractsPage.tsx`: main contract table and Drawer.
- `frontend/src/screens/Accounting/Contracts/AccountingRenewalInline.tsx`: renewal actions in Drawer.
- `frontend/src/components/common/app-status-badge.tsx`: reusable status badge; avoid global semantic style regression.
- `backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs`: aggregated read model, scope and GI-01 presentation.
- `backend/src/KidsfitCRM.Api/Infrastructure/{ServiceInterruptionPolicy,ServiceInterruptionService,ProtectionRenewalPolicy,AutomaticProtectionRenewal}.cs`: domain behavior.

These paths are **snapshots**, not an instruction to hardcode status derivation in presentation. Always check latest `develop` and current tests.