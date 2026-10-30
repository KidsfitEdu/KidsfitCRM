---
name: kidsfit-crm-one-shot-implementation
description: Run the complete KidsfitCRM demo upgrade in one coding-agent session, including safe cleanup, seven-role Backend/Frontend, EF Core/MySQL migration, demo seeding, dump/restore tests, QA, documentation and reviewable PR.
---

# KidsfitCRM — One-shot Implementation

## Mandatory reading
Read `AGENTS.md`, `docs/README.md`, all relevant `docs/requirements/`, `docs/implementation/PHASE_0_BASELINE_AUDIT.md`, `CURRENT_SOURCE_MAP.md`, `PHASED_DELIVERY_PLAN.md`; both existing skills: `.agents/skills/kidsfit-crm-development/SKILL.md`, `.agents/skills/kidsfit-crm-frontend-design/SKILL.md`, their relevant references, and `docs/prompts/MASTER_CRM_IMPLEMENTATION_PROMPT.md`.

## One continuous run
- Start from a clean new branch off `develop`; check HEAD and test environment. Refresh existing Phase-0 audit rather than recreating it.
- Work through audit, cleanup, safe DB migration, Backend, Frontend, seed, dump/restore, tests and docs in **one run**. Use checkpoints and concise progress updates, not repeated approvals for minor engineering choices.
- The user explicitly permits **removal of unnecessary demo code**, not blind deletions. Before REMOVE, prove the feature is out-of-scope or duplicated, trace imports, route IDs, API consumers, EF Core relationships, permissions, tests and CI, then delete dead references together. Old education-center features and separate SalesStaff/Collaborator screens are candidates for evaluation, not automatic deletion. Keep useful abstractions.
- Seven business roles, both employee and CTV with default 10 active-school slots, 5 days + three 7-day extensions, manager→CHECKEE→authorized KIDSFIT grant. Respect OPEN policies (grant actor, provisional 30% commission, extension pending SLA, branch scope), and exclude referrer/split.
- Apply professional quality standards even in demo: validated endpoints, permission/organization scope, transactions, idempotency, exact decimal money, clear TypeScript/UI components, tests, accessible responsive UX.
- All backend **synthetic demo login accounts** use a *single password supplied by the execution environment* as `Seed__DemoPassword` (ASP.NET Core `Seed:DemoPassword`). User has chosen the value in conversation; **do not commit or echo the literal secret** in skill/docs/code, frontend static assets, logs or dumps. Store only per-user `IPasswordHasher<User>` hashes. On an explicitly disposable demo DB, ensure pre-existing seeded users get normalized too; never reset real-user passwords.
- MySQL user/root credentials and JWT signing key MUST remain separate from demo login password. Production demo seed must be disabled; test seed failure if password missing; ensure seed idempotency and no duplicate data.
- Migration, synthetic seed and database **dump** are different operations. No DROP/TRUNCATE/rebaseline unless the agent has verified an **isolated disposable demo database** with no real data; backup and restore-test before destructive demo reset. Never operate on production/shared DB without explicit authorization; never commit dumps with PII/password hashes.
- No unapproved production policy activation or invented permissions. Block the affected part, continue safe independent work. Preserve evidence of actually run tests; don't call skipped tests passed.

## Focused references
- [Cleanup and migration](references/cleanup-and-migration.md)
- [Demo data and credentials](references/demo-data-and-credentials.md)
- [One-shot checklist](references/one-shot-checklist.md)

## Deliverable
One final reviewable PR targeting `develop` (no automatic merge), granular commits, removed/kept code manifest, actual tests and DB isolation evidence, seed/dump verification, unresolved decisions and updated docs/skills.
