# KIDSFIT CRM — repository agent instructions

## Scope, authorization and sources of truth

1. Check the user's exact request and authorization. **“Xác nhận trước khi code” means analysis only**: do not edit, branch, commit or open a PR. “Chốt” authorizes only the approved slice. Never merge, deploy, reset a real database, or overwrite stored customer/financial data without separate permission.
2. Verify the **latest `develop` commit**, relevant open PRs, and real affected code/tests. The GitHub default branch may differ; CRM PRs target `develop`. Read [docs/README.md](docs/README.md), [Decision Log](docs/requirements/DECISION_LOG.md), [Source Map](docs/implementation/CURRENT_SOURCE_MAP.md), and relevant requirements before editing.
3. Distinguish approved product intent, actual implementation and verification evidence. In a conflict: explicit approved user scope and decision log > current requirements for intended behavior > verified code/schema/tests for current behavior > historical notes/skill examples. Identify gaps instead of silently inferring a business rule. `CONFIRMED`, `OPEN`, `IMPLEMENTED`, `VERIFIED` are not interchangeable.
4. Read the **single primary workflow skill** at [kidsfit-crm-dev](.agents/skills/kidsfit-crm-dev/SKILL.md); load only topic-relevant references. Repository-hosted skills are source instructions, **not automatically installed ChatGPT plugins**.

## Skill routing (no mandatory all-skills loading)

- Engineering, API, architecture, security, finance, DB, Git, code review: primary `kidsfit-crm-dev` + the relevant reference.
- School directory, partner/CTV, CHECKEE, renewals, protection and payout: primary skill + `kidsfit-crm-development/references/checkee-sales-crm.md`, `school-directory-workflows.md`, `domain-workflows.md` as applicable. `kidsfit-crm-development/SKILL.md` is a **compatibility/domain entrypoint**, not a second competing workflow.
- UI styling, tables, dashboards, forms and shared components: [frontend-design](.agents/skills/kidsfit-crm-frontend-design/SKILL.md) + primary skill when business/data semantics matter.
- Mobile web, touch/keyboard, overlay/modal, responsive navigation: [webapp-ux](.agents/skills/kidsfit-crm-webapp-ux/SKILL.md) + frontend-design when styling changes.
- Notifications, unread/resolve, recipient routing, worker deduplication and inbox UI: [notifications-and-events](.agents/skills/kidsfit-crm-dev/references/notifications-and-events.md).
- Testing, migration smoke, regression and exact-SHA CI claims: [testing-and-regression](.agents/skills/kidsfit-crm-dev/references/testing-and-regression.md).
- Approved multi-module, staged work only: [one-shot](.agents/skills/kidsfit-crm-one-shot-implementation/SKILL.md) coordinates the relevant specialist references, never overrides safety.

## Runtime / architecture

- Real API Only. React 19, TypeScript, **Vinext**, Tailwind v4, shared shadcn/Base UI, TanStack Query, frontend source `frontend/src/{app,screens,components,config,services}`. Do not migrate the existing CRM to Next.js or React Router by implication; do not restore mock fallback/auth.
- Backend ASP.NET Core .NET 10, EF Core 10, MySQL 8.4/InnoDB/utf8mb4. `JsonNamingPolicy.SnakeCaseLower` applies to HTTP JSON. Check DTO and client request mapping, not only direct feature calls.
- `--seed-demo` is disabled. `--migrate --seed-initial` is a gated Development bootstrap requiring an explicitly disposable DB and private `Seed:AdminPassword`; it is not operational demo data. Test fixtures are separate. Never run database-changing tooling on a real/shared/unknown database.
- Keep modular boundaries; centralize server authorization, organization/record scoping, audit, idempotency, financial precision, and transaction boundaries. Never rely on UI role names for data access. Side effects requiring external delivery run only after commit.

## Business policy guardrails

- Target seven business roles: Admin, BGĐ, Kế toán, Quản lý bán hàng, CSKH, CHECKEE, Sales; technical legacy role codes may remain. Employees and CTV are both Sales under the intended product model.
- Sales/CTV: default 10 concurrent schools, 5-day approach reservation, up to three **approved 7-day extensions** (subject to actual code verification). New school proposal: Sales → direct Manager → Admin.
- School contracts: Sales → direct Manager → CHECKEE verification → separately authorized KIDSFIT five-year protection; the specific grant actor **D-12 remains OPEN**. D-13 pending-extension semantics and D-14 branch scope remain OPEN; never guess.
- D-17/D-18: eligible collected revenue drives default **25% Sales + 5% Manager** versioned BGĐ policies, independent ledger entitlements and shared Accountant/Director payout approval. Historical 30% Sales-only payouts remain immutable; tax/clawback/withholding remain review items. No school referrer commission feature.
- Keep school, main campus/branch, claim/protection, contract, annual renewal, receipts, commissions, payouts and CHECKEE reconciliation distinct. No cancellation, elapsed expiry or frontend badge alone creates a contract/permission transition.
- Legacy education-center lead/guardian/student/course workflow references are separate bounded context; do not apply them blindly to school-sales CRM.

## Delivery and checks

- Inspect affected UI consumers, endpoints, DTOs, permissions, EF mappings, migrations, tests and CI **before** changing shared parts. Reuse current primitives; do not duplicate layouts or invent infrastructure.
- With approved code changes: small task-aligned branch from current `develop`; meaningful Conventional Commits; reviewable PR to `develop`. Do not force-push or edit unrelated modules.
- Match verification to risk; run existing commands from `frontend/package.json` and backend/CI; for MySQL use isolated test DB. Report exact-commit `PASS/FAIL/NOT RUN/BLOCKED`; lint/build does not prove browser visual QA or production readiness. See the testing reference.
- Documentation cleanup may consolidate stale/duplicate **instruction files** after checking backlinks; it never grants permission to delete runtime code, historical migrations, audit/finance records, or real data.
