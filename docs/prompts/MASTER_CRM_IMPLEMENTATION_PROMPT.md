# Master Prompt — Upgrade KidsfitCRM in protected phases

> **Usage:** Copy the **entire prompt** below into a coding agent with a working checkout of \`KidsfitEdu/KidsfitCRM\`. This document is a prompt template, **not an authorization to run it**. Work on a separate branch based on \`develop\`. Read the latest repository files before trusting this snapshot. Never delete working code or real data.

## Prompt (copy everything from here)

You are the senior engineering agent for the existing KidsfitCRM repository (\`https://github.com/KidsfitEdu/KidsfitCRM\`). **Objective:** bring existing .NET 10/MySQL 8.4/EF Core 10 backend, React 19/TypeScript/Vinext/Tailwind 4 frontend, EF migrations, synthetic data and MySQL backup/restore procedures into alignment with the **current** KIDSFIT/CHECKEE school-sales business specification. **Do not start over or delete working modules.**

### Absolute guardrails

- Before changes: \`git status\`, \`git branch --show-current\`, \`git rev-parse HEAD\`. Don't overwrite uncommitted changes; work on own branch based on \`develop\`. Never commit/merge directly to \`main\` or \`develop\`.
- Prioritize **reuse → focused fixes → safe extension → tested refactor**. Preserve unrelated education CRM, existing APIs, route IDs, screens, migrations, roles/memberships, contract claims, historical commission ledger, audit events and MySQL data. No destructive DDL, DROP/TRUNCATE/RESET, role-row deletes, rewriting applied migrations, mass re-seeding or modifying real payouts.
- Don't point tests, migrations, scripts, \`--seed-demo\` or restore at a production/shared/customer database. \`start-local.ps1\` automatically provisions local MySQL and calls \`--migrate --seed-demo\`; \`compose.yaml\` also contains demo-oriented seed config. Inspect target connection, obtain approval and verify restore to separate DB before altering any populated database.
- If a feature would require unapproved business policy (OPEN), irreversible data conversion, production access or deleting working code, **block only that portion** and continue safe independent work. Do not invent permissions, timeouts, financial terms or referrer splitting.
- Never present a passing test that was skipped or not run; never claim visual parity without browser evidence. Server enforces authorization/tenant scopes, not client-only hiding.
- Create **small reviewed commits** and PR(s), do not auto-merge. If scope is too large, break work into independently verifiable PRs.

### Read first (current live paths)

1. \`AGENTS.md\`, \`docs/README.md\`, \`docs/implementation/CURRENT_SOURCE_MAP.md\`, \`docs/implementation/PHASED_DELIVERY_PLAN.md\`.
2. \`docs/requirements/{CRM_FUNCTIONAL_SPECIFICATION,ROLES_AND_PERMISSIONS,BUSINESS_RULES,BUSINESS_WORKFLOWS,DECISION_LOG,CODEBASE_GAP_ANALYSIS}.md\`.
3. \`.agents/skills/kidsfit-crm-development/SKILL.md\` plus relevant \`references/mysql-conventions.md\`, \`checkee-sales-crm.md\`, \`school-directory-workflows.md\` and \`engineering-conventions.md\`.
4. \`.agents/skills/kidsfit-crm-frontend-design/SKILL.md\`, \`docs/design/FRONTEND_DESIGN_SYSTEM.md\`, task-specific frontend references, \`frontend/docs/architecture.md\`.
5. Existing source/tests, not just docs. The frontend moved into \`frontend/src/\`; do not create a parallel \`frontend/app/\` or \`frontend/components/\`.

### Current architecture — inspect before modifying

Backend:
- \`backend/src/KidsfitCRM.Api/Program.cs\` (JWT, DI, \`--migrate\`, \`--seed-demo\`).
- \`backend/src/KidsfitCRM.Api/Features/SchoolActions.cs\` (quota, manager contract review and grant), \`SchoolAllocationActions.cs\` (allocation and extension), \`SchoolProposalActions.cs\`, \`SchoolEndpoints.cs\`, \`SchoolOperationsEndpoints.cs\`, \`ChannelSalesAccess.cs\`, \`ChannelSalesFinanceActions.cs\`, \`SchoolFinanceActions.cs\`, \`SchoolCareActions.cs\`, \`AuthFeatures.cs\`.
- \`backend/src/KidsfitCRM.Api/Infrastructure/KidsfitDbContext.cs\`, \`SchoolModelConfiguration.cs\`, \`SchoolOperationsModelConfiguration.cs\`, \`Migrations/\`, \`DatabaseSeeder.cs\`, \`CrmScenarioSeeder.cs\`.
Frontend:
- \`frontend/src/components/crm/crm-app.tsx\`, \`frontend/src/components/layout/\`, \`frontend/src/components/common/\`, \`frontend/src/app/globals.css\`.
- \`frontend/src/screens/{Admin,SalesManager,SalesStaff,Collaborator,Checkee,Board,Accounting,CustomerCare,Auth}/\`.
- \`frontend/src/config/{navigation,role-pages,routes}.ts\`, \`frontend/src/services/\`, \`frontend/src/lib/demo-auth.ts\`, \`frontend/tests/\`.
- Keep existing Vinext \`src/app/\` routing and GitHub Pages demo separate.

### Approved business target and OPEN boundaries

- Seven **business** roles: Admin, BGĐ KIDSFIT, Kế toán, Quản lý bán hàng, CSKH, CHECKEE, Sales. Sales includes both employees and collaborators, both may self-register and receive manager allocations; 10 concurrent active schools each by default, Admin may change with audit. Preserve legacy stored codes until safe mapping is tested.
- Initial school approach 5 days. Approve at most **three extensions**, **7 days each**, only after evidence and manager decision; handle expiry/race safely.
- New school proposal: Sales → direct partner/KIDSFIT Sales Manager → Admin canonical directory. Proposal alone does not claim ownership.
- Contract: Sales → direct KIDSFIT or partner Sales Manager review and CHECKEE submission → CHECKEE verifies → authorized KIDSFIT actor records 5-year protection from verification. BGĐ is oversight/exception, **not routine per-contract gate**. **OPEN:** exact KIDSFIT final-grant permission owner. Don't silently assign Admin or Manager, and do not auto-grant.
- 30% Sales commission is **provisional only**. Calculation base, trigger, actual effective policy and refund handling are OPEN. Current 10%/12% demo and 20%/15% ceilings must not become real financial rules.
- No separate referrer/personal commission split feature. Preserve customer privacy, partner isolation, audit/financial history. School-main/branch scope and pending-extension SLA have unresolved cases.

### Phase 0 — Audited baseline (no feature changes)

Inspect live checkout paths, roles, permissions, effective migration state, CI, tests, demo-vs-real API behavior. Build a matrix \`rule → current file/API/table/screen → already works / needs fix / missing / policy-blocked → tests\`. Run available **non-mutating** baseline validation and record actual PASS/FAIL/SKIPPED/NOT_RUN. Fix no unrelated code. Do not proceed with DB writes without isolated target.

**Gate:** written file-specific plan, identified blocked decisions, baseline evidence.

### Phase 1 — Migration and data safety

Inventory EF migrations, \`KidsfitDbContext\`, MySQL indexes, current role and membership rows, contracts/ledger. Prepare reversible/forward-compatible **new** migrations only if needed; don't edit applied files. Use disposable MySQL 8.4 populated test DB and verify schema/data invariants, rollout and rollback/restore plan. Real MySQL backup/dump is a **separate** task requiring authorized connection, consistent snapshot, encrypted/private storage, and validated restore to a new isolated DB. Never put SQL dump, secrets or personal data in Git.

**Gate:** isolated migration tests and restore evidence; safe independent phases may proceed even if an OPEN policy blocks part of schema.

### Phase 2 — Backend permissions and Sales capacity

Inspect \`DatabaseSeeder.cs\`, \`ChannelSalesAccess.cs\`, \`SchoolActions.cs\`, \`OrganizationMembership\`. Existing \`IsCollaborator\` gate currently exempts internal Sales from quota; fix for **both** employee and collaborator Sales, including self-claims and manager allocations, default 10, Admin override with reason/audit; do not revoke already-valid ownership when quota falls. Use transactional capacity serialization and tenant/ownership checks; preserve legacy role IDs and permissions during transition. Write boundary and concurrent registration tests.

**Gate:** RBAC + per-organization quota and idempotency tests pass.

### Phase 3 — School proposals, allocation, approach and extension

Reuse \`SchoolProposalActions.cs\` manager-first proposal routing; do not reimplement existing functioning flow. Audit \`SchoolAllocationActions.cs\` and active policy version logic; add/activate explicitly versioned 5-day + 7-day × 3 policy only in approved test-safe contexts; reject fourth, stale-owner and late-grant races. Append activity logs, preserve contact timeline and school units. Pending-review extension SLA still OPEN: no indefinite holding default or invented 24/48h rule.

**Gate:** proposal, allocation, extension, expiry, conflict and audit tests pass.

### Phase 4 — Contracts, CHECKEE and protection

Check \`ReviewSchoolContract\`, \`GrantSchoolProtection\`, CHECKEE reconciliation endpoints and manager visibility. Both KIDSFIT and partner managers should submit reviewed dossiers directly to CHECKEE; no routine Director approval. CHECKEE confirmation alone does not grant 5 years. Keep final KIDSFIT grant scoped and **BLOCKED pending role approval** without changing current production authorization. Test no grant before verification and no takeover of new protected ownership.

**Gate:** manager→CHECKEE flow and negative authorization tests pass; unresolved grant actor explicitly reported.

### Phase 5 — Payments, commission, CSKH

Preserve \`RevenueReceipt\`, schedules, \`CommissionPolicyVersion\`, ledger/payouts, refund/adjustment and CSKH handover. Verify installment history, due/collected/refunded balances, ledger immutability, server decimal arithmetic, tenant scope, audited handover and prior earned commission. Don't activate 30%, rewrite past finance or add referrer split.

**Gate:** MySQL financial and support regression tests pass.

### Phase 6 — Frontend incremental integration

Continue the existing \`frontend/src/\` architecture, refactor *per screen* and share UI rather than rewriting \`crm-app.tsx\` or routing. Keep legacy page IDs and SalesStaff/Collaborator compatibility while converging into Sales business UX. Reuse page header, buttons, list toolbar, pagination, alerts/confirm dialogs and KIDSFIT design tokens. Validate real API vs demo preview, loading, empty/error, status/overdue, permission scope, mobile/tablet/dark/keyboard. Browser checks only count when actually rendered.

**Gate:** lint, TS, build, demo/page tests and browser smoke where available.

### Phase 7 — Synthetic seed vs dump/restore

Reuse \`DatabaseSeeder.cs\` and \`CrmScenarioSeeder.cs\`; seed only **fresh disposable demo/test DB** with \`--seed-demo\`. Idempotent fixtures for seven target role mapping and legacy access, organizations, school/branches, 10/11/20 capacity, manager/admin proposals, extension 1–3 and fourth denial, CHECKEE verification, receipts, refunds, CSKH, disputes. Negative inconsistent states belong primarily in tests, not broken seed rows. Do not create actual payable commission at provisional 30%.

A dump of a real DB is **not seed data**. Only with explicit authorization and safe credentials: perform backup, document snapshot/restore procedure, verify restore to *separate disposable* DB. No real dumps in repo.

**Gate:** repeated seed does not duplicate; isolated backup/restore validation passes when authorized.

### Phase 8 — Integration and regression

Commands:
- \`dotnet test backend/KidsfitCRM.slnx\`
- \`backend/test-mysql.ps1\` in PowerShell **only** when \`KIDSFIT_TEST_MYSQL_ADMIN\` targets dedicated disposable MySQL 8.4 test instance.
- From \`frontend/\`: \`npm ci\`, \`npm run lint\`, \`npx tsc --noEmit\`, \`npm run test:demo\`, \`npm run build\`, \`npm run build:pages\`, \`npm run test:pages\`.
- Browser Chromium smoke follows \`.github/workflows/frontend-refactor.yml\` and \`frontend/tests/browser/\` (install test browser only when allowed and actually inspect output).

Cover all role scoping, concurrency, migrations, no regressions to education CRM, contract confirmation, finances, seed, responsive and accessible interactions. Do not confuse skipped tests with passing tests.

**Gate:** evidence-based PASS/FAIL/SKIPPED/NOT_RUN/BLOCKED and remediation list.

### Phase 9 — Documentation and handoff

Update \`docs/requirements/CODEBASE_GAP_ANALYSIS.md\`, \`docs/implementation/\`, \`docs/testing/\`, \`docs/operations/\`, \`frontend/docs/architecture.md\` and skills if source paths move. Confirm Markdown relative links resolve, current file targets exist, and that no stale \`frontend/components/\` paths remain. Summarize each phase: changed/reused/preserved files, migration/data impact, tests actually executed, OPEN blockers and commit SHAs. Open reviewable PR(s); **no automatic merge**.

**Start with Phase 0**. Continue safe independent work phase by phase where feasible; do not request confirmations for minor technical edits, but stop policy-blocked, destructive or production-affecting actions for explicit authorization.

## End of prompt

This prompt is deliberately long because it is a workflow contract, **not** a single terminal shell command. For a one-message kick-off, instruct the coding agent to "Read \`docs/prompts/MASTER_CRM_IMPLEMENTATION_PROMPT.md\` and execute from Phase 0 on a new branch, honoring all gates and preserving existing data."