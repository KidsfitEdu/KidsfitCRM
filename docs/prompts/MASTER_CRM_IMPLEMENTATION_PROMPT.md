# KIDSFIT CRM — implementation prompt (current runtime)

**Status:** reusable agent instructions; not automatically executed. **Static baseline:** `develop` `4e9c99db374c082289608c60573a7894ee375834` (2026-11-21). Recheck latest HEAD before any change.

## Prompt
> You are implementing an explicitly approved KIDSFIT CRM scope. First read `AGENTS.md`, `docs/README.md`, `docs/requirements/DECISION_LOG.md`, `docs/requirements/CODEBASE_GAP_ANALYSIS.md`, `docs/implementation/CURRENT_SOURCE_MAP.md`, `docs/implementation/FEATURE_STATUS_MATRIX.md`, `.agents/skills/kidsfit-crm-dev/SKILL.md`, and the task-specific specialist references. Inspect live code, actual routes, DTOs, entities, permissions, UI consumers and tests.
>
> If the request says “xác nhận trước khi code,” provide analysis and stop. After approval, work on a feature branch from current `develop`, use tested reusable components and preserve existing API/auth/organization boundaries. Plan and document KEEP/REWRITE/MERGE/REMOVE, but never erase real/unknown-custody data, audit/finance history or previously applied migrations.
>
> Current runtime: React 19 + TypeScript + Vinext, ASP.NET Core .NET 10, EF Core 10 + MySQL 8.4; **Real API Only**. Use snake_case JSON contracts per `Program.cs`. **`--seed-demo` is disabled**; `InitialCrmSeeder` is guarded initial configuration with private `Seed:AdminPassword` on explicitly disposable Development DB. Synthetic scenarios belong in isolated test fixtures, not public accounts or production fallbacks.
>
> Target model: seven business roles; Sales quota 10, approach protection 5 days and up to three 7-day approved extensions, proposals through Manager→Admin and contracts through Manager→CHECKEE→authorized KIDSFIT grant. D-12 grant actor remains OPEN. D-17 supersedes historical Sales-only 30%: board policy default is 25% Sales + 5% Manager on eligible received cash, overrides scoped and versioned. D-18 controls shared Accountant/BGĐ payout approval. Never rewrite frozen paid ledgers. Never create referrer split.
>
> Keep the smallest approved change, test relevant role and tenant scopes, concurrency, error handling, responsive UI and audit. Run targeted tests on the exact working state and isolate MySQL; report PASS/FAIL/NOT RUN/BLOCKED truthfully. Update docs/skills when source or business mapping changes. Write meaningful Conventional Commits and open one reviewable PR to `develop`; no auto-merge or production deployment.

## Acceptance / handoff template
- APPROVED SCOPE / EXCLUSIONS:
- HEAD / BRANCH / PR:
- SOURCE & TEST EVIDENCE:
- BUSINESS DECISIONS (CONFIRMED vs OPEN):
- API / UI / SCHEMA / SECURITY CHANGES:
- KEEP / REWRITE / MERGE / REMOVE:
- TESTS: PASS / FAIL / NOT RUN / BLOCKED:
- DATA SAFETY / MIGRATION ISOLATION:
- REMAINING RISKS / NEXT SAFE ACTIONS:
