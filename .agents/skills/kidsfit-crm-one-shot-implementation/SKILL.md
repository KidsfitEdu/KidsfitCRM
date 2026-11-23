---
name: kidsfit-crm-one-shot-implementation
description: Coordinate an explicitly approved broad KidsfitCRM implementation with safe dependency-based cleanup, current real-API architecture, isolated tests, documentation and a reviewable PR.
---

# KIDSFIT CRM — broad-scope implementation

Use **only when the user approves a broad multi-module coding project**. This skill does not authorize demo seeding, database resets, application rewrites or production actions.

## Responsibility boundary

- This skill **coordinates** an explicitly approved multi-module implementation. The [primary skill](../kidsfit-crm-dev/SKILL.md) owns engineering and Git/CI workflow; [domain reference index](../kidsfit-crm-development/SKILL.md), [Frontend Design](../kidsfit-crm-frontend-design/SKILL.md) and [Webapp UX](../kidsfit-crm-webapp-ux/SKILL.md) are loaded only when relevant.
- Never interpret "chốt" as approval for unrelated code, production DB deletion, merge, deploy or changed OPEN decisions. Use [Testing & Regression](../kidsfit-crm-dev/references/testing-and-regression.md) for exact-SHA evidence.

## Mandatory start
1. Read `AGENTS.md`, `docs/README.md`, `docs/requirements/DECISION_LOG.md`, `docs/implementation/CURRENT_SOURCE_MAP.md`, `docs/requirements/CODEBASE_GAP_ANALYSIS.md`, relevant primary engineering/domain/UI skills and live source.
2. Verify latest `develop` HEAD and whether a relevant PR already exists. Create a branch for approved changes only.
3. Build KEEP/REWRITE/MERGE/REMOVE manifest for each affected source and documentation dependency. Confirm routes, imports, EF FKs, permissions, tests and DB provenance before proposing deletion.

## Current facts (2026-11-21 snapshot)
- Runtime is **Real API Only**, not static demo. `Program.cs` **rejects `--seed-demo`**. Do not resurrect `DatabaseSeeder.cs`, `demo-auth.ts` or public demo passwords.
- `InitialCrmSeeder.cs` handles guarded Development bootstrap via `--migrate --seed-initial` and private `Seed:AdminPassword`, without seeding example schools or contracts.
- Synthetic scenarios belong in isolated test fixtures. No production/shared/unknown-custody database mutation without explicit independent authorization.
- Seven target roles, Sales capacity 10 and 5+7×3 approach rules are approved intent; verify runtime before changing code.
- Finance D-17: **25% Sales + 5% Manager** BGĐ board policy for future receipts; D-18 governs payout approval; preserve historical 30% frozen ledgers. Final KIDSFIT protection grant actor D-12 remains OPEN.

## Execution and quality gates
- Plan bounded modules and dependencies; preserve deployed URLs, authorization scopes, contract/financial audit, migrations and compatibility.
- Never drop/truncate/overwrite shared data or reset real-user passwords. Any destructive disposable-test action needs explicit isolation proof.
- Use exact database-backed tests for financial, concurrency, multi-tenant or permission changes. Report PASS/FAIL/NOT RUN/BLOCKED on the exact commit; static checks do not imply runtime QA.
- Keep frontend framework, JSON snake_case contracts and current UI components. No mock-data fallback.
- Update related docs/skills alongside source changes. Make concise Conventional Commits and one reviewable PR to `develop`; do not auto-merge or deploy.

## Supporting references
- [Cleanup and migration](references/cleanup-and-migration.md)
- [Test data and credentials](references/demo-data-and-credentials.md)
- [Quality checklist](references/one-shot-checklist.md)
