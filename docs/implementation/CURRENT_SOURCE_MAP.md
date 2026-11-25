# KIDSFIT CRM — source map

**Source inspection / skill-guidance review:** `develop` at `780ed155f4872e2f61dacd267bd2c340782282ca` (2026-11-23). This is a **path and static-code snapshot**, not a claim that all features passed runtime tests. Check latest HEAD before implementation.

| Area | Current source | Notes |
| --- | --- | --- |
| Frontend entry | `frontend/src/app/page.tsx` → `frontend/src/components/crm/crm-app.tsx` | React 19, TypeScript, Vinext; Real API Only |
| Routes / role navigation | `frontend/src/app/crm/[view]/page.tsx`, `frontend/src/config/{routes,navigation,role-pages,sales-navigation}.ts` | Retain compatible legacy view IDs/aliases |
| Role screens | `frontend/src/screens/{Admin,SalesManager,SalesStaff,Board,Accounting,CustomerCare,Checkee,Auth}/` | Other compatibility screen directories may remain; do not equate folder names with RBAC |
| Shared shell / profile | `frontend/src/components/layout/`, `UserProfileMenu.tsx` | Sidebar, Header, profile, password, avatar |
| Common UI | `frontend/src/components/common/`, `frontend/src/components/ui/`, `frontend/src/app/globals.css` | Reuse existing components / design tokens |
| Frontend transport | `frontend/src/services/api.client.ts` | JWT bearer requests, JSON/error handling |
| Frontend tests | `frontend/tests/`; `frontend/package.json` | `lint`, `test:unit`, `test:pages`, `build` |
| Backend app | `backend/src/KidsfitCRM.Api/Program.cs` | .NET 10, JWT security_stamp validation, MySQL, configuration, migrations |
| Backend routes and use cases | `backend/src/KidsfitCRM.Api/Features/` | Thin endpoints and feature actions; verify every specific permission |
| Access and validation | `Authorization/ChannelSalesAccess.cs`, `Common/ChannelSalesValidation.cs` | Organization and record scope, request fingerprints and shared validation |
| Auth / profile | `Routing/ApiEndpoints.cs`, `Features/Auth/` | `/api/me/change-password`, password recovery, snake_case JSON |
| School / Sales | `Features/SchoolActions.cs`, `Features/Schools/Directory/SchoolEndpoints.cs`, `Features/Schools/{Allocations,Extensions,Proposals,Policies}/` | School action partials are grouped by domain; public types keep `KidsfitCRM.Api.Features` namespace and original routes |
| Commissions | `Features/Commissions/Policies/`, `Features/Commissions/Accruals/`, `Features/Commissions/Income/` | Versioned BGĐ policy, receipt-based accruals and backfill, Sales/Manager income read model |
| Receipts | `Features/Accounting/Receipts/` | Receipt queries, recording and request contract |
| Finance / payout | `Features/Accounting/Payouts/AccountingPayoutEndpoints.cs`, `Features/Contracts/Accounting/AccountingContractEndpoints.cs` | Accounting workflow and contract-scoped read model |
| Database | `Infrastructure/KidsfitDbContext.cs`, `Infrastructure/Migrations/` | EF Core 10 + MySQL 8.4; migration history is immutable |
| Bootstrap | `Infrastructure/InitialCrmSeeder.cs` | `--migrate --seed-initial` only in explicitly disposable Development context |
| Backend tests | `backend/tests/KidsfitCRM.Api.Tests/` | xUnit and isolated MySQL tests/fixtures |
| Notifications | `Features/Notifications/WorkflowNotificationEndpoints.cs`, `Infrastructure/{CrmNotificationWriter,SchoolProposalAlertService,ContractExpiryAlertService}.cs` | Unified `crm_notifications` inbox, event writers and scheduled notices; inspect current route and schema before edits |
| CI | `.github/workflows/` | Frontend, isolated MySQL, password recovery, commission, escalation workflows |
| Personnel | `Features/Personnel/` | Personnel administration and sales membership |
| CHECKEE | `Features/Checkee/{Verification,Reconciliation,Support}/` | Contract verification, reconciliation and support |
| Customer care | `Features/CustomerCare/` | Handover, support cases and care activity |
| School directory, approaches and protection | `Features/Schools/{Directory,Approaches,Protection}/` | School records and import, contact history and protection renewal |
| Service interruption | `Features/Contracts/ServiceInterruption/` | Contract interruption endpoints |
| Financial evidence | `Features/Evidence/` | Shared evidence endpoints for contracts, renewals, receipts and payouts |
| Reporting | `Features/Reports/` | Manager progress and sales dashboard |

## Agent and skill routing
- [AGENTS.md](../../AGENTS.md) selects the [primary engineering skill](../../.agents/skills/kidsfit-crm-dev/SKILL.md), its [notification](../../.agents/skills/kidsfit-crm-dev/references/notifications-and-events.md) and [testing](../../.agents/skills/kidsfit-crm-dev/references/testing-and-regression.md) references, and optional specialist UI/UX/domain skills. `kidsfit-crm-development/SKILL.md` is kept for compatibility, with its original domain references retained.
- This file is a dated **static source map**, not an assertion that every feature passed runtime or production tests.

## Important current contracts
- `Program.cs` configures `JsonNamingPolicy.SnakeCaseLower`. Password-change JSON must use `current_password`, `new_password`, `confirm_password`; a direct call to `AuthFeatures.ChangeOwnPassword` is not equivalent to an HTTP-binding test.
- `--seed-demo` is **rejected** by the backend; old `DatabaseSeeder` and `CrmScenarioSeeder` references belong to test fixtures/historical notes, not live startup. Never recreate a static preview as a production API fallback.
- The snapshot includes auth/password migrations `20261120100000_PasswordResetChallenges` and `20261120165000_PrivateUserAvatar`. `No migrations applied` does not resolve EF's separate pending-model-changes warning.
- Director commission policy defaults to **25% Sales + 5% Manager** in `Features/Commissions/Policies/BoardCommissionPolicy.cs`; historical 30% is not the default for new accruals.
- When identifying a live feature, trace route → DTO → permission → action → EF mapping → frontend consumer → tests. Naming a file is not implementation evidence.

## Channel Sales action ownership

The existing `ChannelSalesActions` entry points and shared scope checks are composed from domain-owned partials. Payout mutations live in `Features/Accounting/Payouts/`, commission adjustments in `Features/Commissions/Accruals/`, and CHECKEE case decisions in `Features/Checkee/Reconciliation/`. Personnel and support actions live in `Features/Personnel/` and `Features/CustomerCare/`. Each action still owns its original transaction.

## Safety
- Never run migrations/seed/test DB scripts without confirming database ownership and disposable isolation.
- Preserve financial/audit records, contract ownership, school contact PII and historical migrations.
- See [feature status](FEATURE_STATUS_MATRIX.md), [API contracts](../architecture/API_CONTRACTS.md), and [gap analysis](../requirements/CODEBASE_GAP_ANALYSIS.md).


## Backend school feature module layout

The `.NET 10` API remains a **single project** and continues using **Minimal API**. These file moves do not change EF Core, database migration paths, HTTP routes, public types, namespace, dependency injection registration, or business rules.

```text
Features/
  SchoolOperationsEndpoints.cs         # existing HTTP route entrypoint (unchanged)
  SchoolActions.cs                     # existing school workflow partials (unchanged)
  ChannelSalesActions.cs              # existing aggregate orchestration
  Schools/
    Allocations/
      SchoolAllocationActions.cs       # partial ChannelSalesActions, original namespace
      SchoolApproachReleaseActions.cs  # partial ChannelSalesActions, original namespace
      SchoolInvitationResponsePolicy.cs
    Extensions/
      SchoolExtensionLimitPolicy.cs
    Policies/
      SchoolPolicyManagementActions.cs # partial ChannelSalesActions, original namespace
    Proposals/
      SchoolProposalActions.cs         # partial ChannelSalesActions, original namespace
      SchoolProposalDraftActions.cs    # partial ChannelSalesActions, original namespace
      SchoolProposalAdminProfileActions.cs # partial ChannelSalesActions, original namespace
```

**Compatibility rule:** Files moved under `Features/Schools/` intentionally retain `namespace KidsfitCRM.Api.Features;` for `ChannelSalesActions` partial declarations. C# default SDK glob compilation includes the new directories automatically; do **not** introduce a second `ChannelSalesActions` type, change endpoint routes, or modify database mappings merely to align directory and namespace names. The two stateless policies in `Schools/Allocations` and `Schools/Extensions` keep their dedicated namespaces.

## Contract endpoint module layout

The Contracts module groups existing endpoint source files by business responsibility **without changing code, namespace, public types, routes, authorization, DTOs, DI, EF Core, MySQL, migrations or stored data**.

```text
Features/
  Contracts/
    Renewals/
      ContractRenewalEndpoints.cs
    Accounting/
      AccountingContractEndpoints.cs
    Management/
      ManagerContractEndpoints.cs
```

These relocated files intentionally retain `namespace KidsfitCRM.Api.Features;` so existing route registration and callers remain source-compatible. The SDK automatically compiles nested `.cs` files. No Controller/Repository layer is introduced.

Before merge, update only tests or tooling that explicitly read former file locations; verify exact-HEAD frontend source tests, Backend build/.NET tests, and isolated MySQL 8.4 integration regression. UI/session/routing refactor must occur separately.
