# KidsfitCRM — phased delivery plan for AI coding agent

**Status:** Implementation proposal only; no code/runtime/data changes approved by the existence of this document. Business constraints: \`docs/requirements/\`. Source paths: [current source map](CURRENT_SOURCE_MAP.md). Runnable user-facing instruction: [Master Prompt](../prompts/MASTER_CRM_IMPLEMENTATION_PROMPT.md).

## Mandatory guardrails

Preserve existing working code, modules, page routes, aliases, data, migrations, finance/commission and audit history; do not drop/recreate, truncate or override real DB. No production migrations, demo seeding or dumps without explicit environment approval. Use a dedicated branch from \`develop\`, verify clean checkout, isolate MySQL and retain baseline test results. Do not transform unresolved policy questions into code defaults. Small, reviewable commits/PRs per phase.

## Phases and quality gates

| Stage | Work | Evidence needed for exit |
| --- | --- | --- |
| 0 | Read \`AGENTS.md\`, \`docs/\`, both skills and actual source; inventory current code, CI and config | Matrix requirement→source→gap→proposed patch→test; baseline results; blocked decisions |
| 1 | DB inventory, backup/restore *of isolated sample*, additive EF Core migrations and role compatibility plan | No data loss, migration/rollback plan, MySQL integration tests on populated **disposable** DB |
| 2 | Backend RBAC and Sales capacity for employee+CTV; map legacy role codes | Auth/org scope tests and 10-slot race tests |
| 3 | Proposal→manager→Admin; school allocation, activity, expiry, extension 5+7×3 | Workflow and concurrency tests, no stale rights takeover |
| 4 | Sales→Manager (KIDSFIT/partner)→CHECKEE; protection after valid CHECKEE verification | Direct-manager handoff verified; **OPEN** KIDSFIT grant actor remains gated |
| 5 | Receipts/commissions/CSKH/handovers; no unapproved 30% payouts | Finance ledger, idempotency, tenant privacy and audit tests |
| 6 | Frontend in \`frontend/src/\`; reuse components and legacy route adapters; role-based visual QA | Typecheck/lint/build + demo/pages/browser smoke and actual visual evidence |
| 7 | Synthetic seed fixture coverage and **separate** DB backup/dump/restore test | Repeat seed is idempotent; dump restores to new sandbox DB; no PII/secrets committed |
| 8 | End-to-end integration, regression and security / scopes | PASS/FAIL/SKIPPED/NOT_RUN/OPEN report, evidence-based fixes |
| 9 | Update docs/gaps/skills, commits, PR and handoff | Verified links and exact file paths, no changes outside authorized scope |

**Iteration rule:** stages may revise earlier work when tests uncover defects, but must not silently bypass an earlier failed safety gate. Safe independent tasks can continue when a policy-blocked slice is explicitly marked blocked.

## Known policy decisions still OPEN

- Which **KIDSFIT** account has \`channel_sales.school.protection.grant\` after valid CHECKEE confirmation. The existing Admin permission is not evidence of final desired owner; do not arbitrarily delegate it or auto-grant.
- Sales 30% commission: **provisional**; base, trigger, approval, taxes/refund treatment and effective policy need finance signoff.
- Pending extension review hold/SLA; main school vs branch protection scope; cancellation/refund specifics and any expanded cross-partner visibility.

## Tests and runtime scripts

- Backend: \`dotnet test backend/KidsfitCRM.slnx\`.
- MySQL (separate instance): \`backend/test-mysql.ps1\` with correct \`KIDSFIT_TEST_MYSQL_ADMIN\`.
- Frontend \`cd frontend\`: \`npm ci\`; \`npm run lint\`; \`npx tsc --noEmit\`; \`npm run test:demo\`; \`npm run build\`; \`npm run build:pages\`; \`npm run test:pages\`.
- UI browser smoke: \`.github/workflows/frontend-refactor.yml\` (\`tests/browser/*.test.mjs\`, Playwright Chromium when environment permits).
- \`start-local.ps1\` is **not** a safe generic test command: it auto-runs migrations + \`--seed-demo\`, and has local MySQL provisioning side effects.
- \`compose.yaml\` is demo-oriented: check \`Seed__DemoEnabled\` and connection target before any run.

## Handoff for every stage

Record changed files, preserved functionality, affected schema/rows and migration compatibility, actual commands/results, remaining mismatches vs docs, and no fabricated test claims. Maintain \`docs/requirements/CODEBASE_GAP_ANALYSIS.md\` at the latest source revision. Never merge automatically without review.
