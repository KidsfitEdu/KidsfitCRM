# KIDSFIT CRM — source map

**Source inspection:** `develop` at `4e9c99db374c082289608c60573a7894ee375834` (2026-11-21). This is a **path and static-code snapshot**, not a claim that all features passed runtime tests. Check latest HEAD before implementation.

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
| Auth / profile | `Features/{ApiEndpoints,AuthFeatures,PasswordResetFeatures}.cs` | `/api/me/change-password`, password recovery, snake_case JSON |
| School / Sales | `Features/{SchoolActions,SchoolAllocationActions,SchoolProposalActions,SchoolEndpoints}.cs` | Ownership, proposals, allocations, capacity, contract steps |
| Finance / payout | `Features/{BoardCommissionPolicyEndpoints,AccountingPayoutEndpoints,AccountingContractEndpoints}.cs` | Board policy versioning, accounting workflow |
| Database | `Infrastructure/KidsfitDbContext.cs`, `Infrastructure/Migrations/` | EF Core 10 + MySQL 8.4; migration history is immutable |
| Bootstrap | `Infrastructure/InitialCrmSeeder.cs` | `--migrate --seed-initial` only in explicitly disposable Development context |
| Backend tests | `backend/tests/KidsfitCRM.Api.Tests/` | xUnit and isolated MySQL tests/fixtures |
| CI | `.github/workflows/` | Frontend, isolated MySQL, password recovery, commission, escalation workflows |

## Important current contracts
- `Program.cs` configures `JsonNamingPolicy.SnakeCaseLower`. Password-change JSON must use `current_password`, `new_password`, `confirm_password`; a direct call to `AuthFeatures.ChangeOwnPassword` is not equivalent to an HTTP-binding test.
- `--seed-demo` is **rejected** by the backend; old `DatabaseSeeder` and `CrmScenarioSeeder` references belong to test fixtures/historical notes, not live startup. Never recreate a static preview as a production API fallback.
- The snapshot includes auth/password migrations `20261120100000_PasswordResetChallenges` and `20261120165000_PrivateUserAvatar`. `No migrations applied` does not resolve EF's separate pending-model-changes warning.
- Director commission policy defaults to **25% Sales + 5% Manager** in `BoardCommissionPolicyEndpoints.cs`; historical 30% is not the default for new accruals.
- When identifying a live feature, trace route → DTO → permission → action → EF mapping → frontend consumer → tests. Naming a file is not implementation evidence.

## Safety
- Never run migrations/seed/test DB scripts without confirming database ownership and disposable isolation.
- Preserve financial/audit records, contract ownership, school contact PII and historical migrations.
- See [feature status](FEATURE_STATUS_MATRIX.md), [API contracts](../architecture/API_CONTRACTS.md), and [gap analysis](../requirements/CODEBASE_GAP_ANALYSIS.md).
