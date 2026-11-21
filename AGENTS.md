# KIDSFIT CRM — current repository guidance

## Current runtime and safety (develop snapshot 2026-11-21)
- Read the latest `develop` HEAD, `docs/README.md`, `docs/requirements/DECISION_LOG.md`, and actual affected code/tests before implementation. The GitHub default branch can be `main`, but feature PRs target `develop`.
- Current runtime is **Real API Only**: React 19 + TypeScript + Vinext, .NET 10 ASP.NET Core, EF Core 10 / MySQL 8.4. Frontend lives in `frontend/src/`, backend in `backend/src/KidsfitCRM.Api/`. Do not restore static demo auth or mock fallback.
- **`--seed-demo` is disabled** in `Program.cs`. `--migrate --seed-initial` uses `InitialCrmSeeder`, requires an explicitly disposable Development database and private `Seed:AdminPassword`; it does NOT create operational demo customers or contracts. Synthetic scenarios are isolated test fixtures.
- JSON HTTP contracts use `JsonNamingPolicy.SnakeCaseLower`. Trace actual DTOs and request/response bindings before editing frontend calls. Password-change inputs are `current_password`, `new_password`, `confirm_password`.
- Documentation and skill cleanup **may rewrite, merge or remove inaccurate, stale, duplicate instructions or files** after checking references; preserve current business approvals, audit/financial history, historical migration provenance and data safety. Documentation edits never authorize deleting runtime code or database records.

## Business decision boundaries
- Seven target business roles: ADMIN, DIRECTOR/BGĐ, ACCOUNTANT, SALES_MANAGER, CUSTOMER_SERVICE, CHECKEE, SALES. Existing technical role IDs and presentation aliases can persist; don't infer actual permissions solely from a UI name.
- Approved Sales approach baseline: default 10 concurrent school slots, 5-day reservation, at most three approved 7-day extensions. Actual enforcement must be verified in code/tests.
- Sales proposal → authorized Manager → Admin. Contract → authorized Manager → CHECKEE verification → separately gated KIDSFIT long-term protection. D-12 actor assigning that final grant remains OPEN.
- **D-17 supersedes historic Sales-only 30% commission**. Current default is 25% Sales + 5% Manager with BGĐ policy overrides and eligible collected cash; D-18 defines Accountant/Director shared payout approval. Preserve immutable historical 30% ledger entries.
- Unapproved approval actors, SLA/grace, main school/branch scope, tax/clawback handling remain OPEN. Never silently implement guessed business behavior.

## ChatGPT / repository skill discovery

- **Primary cross-functional KIDSFIT CRM skill:** `.agents/skills/kidsfit-crm-dev/SKILL.md`. Read this for CRM implementation, code review, UI/UX, contracts, renewals KC-02, GI-01, finance, security, Git and CI; load only the task-relevant files under `.agents/skills/kidsfit-crm-dev/references/`.
- This is a **repository-hosted instruction file**, not an automatically installed ChatGPT plugin. When working from ChatGPT, access it through the connected GitHub repository (read `AGENTS.md` and the skill by path), or install the skill separately if that workflow is supported. Do not claim GitHub upload alone installed a ChatGPT skill.
- Keep the existing specialist skills (`kidsfit-crm-development`, `kidsfit-crm-frontend-design`, `kidsfit-crm-webapp-ux` and one-shot implementation) for their appropriate domain workflows. Follow the latest approved `docs/requirements/DECISION_LOG.md` and source code when any skill snapshot is stale.
- Work on the latest branch/HEAD. For user requests requiring confirmation, stop before code. For approved Git changes, use multiple meaningful incremental Conventional Commits when appropriate; never force-push/rewrite published commits without explicit authorization.

# KidsfitCRM repository instructions

## Scope and sources of truth

- **Live code map (recheck on each task):** `docs/implementation/CURRENT_SOURCE_MAP.md`. UI source now lives in `frontend/src/`: Vinext routes `src/app/`, workspace/screens `src/screens/`, components `src/components/`, services `src/services/`. Do not follow deprecated paths such as `frontend/components/` or create parallel `frontend/app/` directories.
- **Phased delivery:** `docs/implementation/PHASED_DELIVERY_PLAN.md` is the execution framework; read `docs/requirements/` first for approved policy. Stages require baseline tests, explicit test DB isolation, additive migrations and actual evidence. Never delete working code merely to align names.
- **Data safety:** migration, guarded initial bootstrap, test fixtures and database backups are distinct. Review `start-local.ps1`, compose and connection settings before running any command; never run data-changing scripts against real/shared databases.

## Scope and sources of truth

- For **current KIDSFIT/CHECKEE school-sales business requirements**, start at `docs/README.md`, then read the task-specific file under `docs/requirements/`. The current seven-role business model, 10-slot Sales limit, 5+7×3 protection, and Sales Manager→CHECKEE contract verification supersede historical product recommendations. This is a target specification, not a statement that code has been migrated.
- Compare any product requirement with `docs/requirements/CODEBASE_GAP_ANALYSIS.md`. Never silently delete legacy `BOARD`, `CHANNEL_SALES`, `PARTNER_ADMIN`, `PARTNER_COLLABORATOR` roles or historical/audit/financial data. Their technical code names may remain while business UI converges on seven roles.
- **OPEN**: the KIDSFIT actor who grants five-year protection after CHECKEE verification. For commissions, use D-17/D-18, not the superseded 30% rule.
- No referrer or personal referral-commission split feature is in scope.


- Implement only the user's requested slice. The product requirement is a baseline, not a request to scaffold the entire CRM.
- For **KidsfitCRM frontend design, layout, component styling, responsive behavior, accessibility or screenshot/UI review**, use `.agents/skills/kidsfit-crm-frontend-design/SKILL.md` and the relevant references plus `docs/design/FRONTEND_DESIGN_SYSTEM.md`. For app-like Web UX, mobile-first interaction, virtual keyboards, safe areas, navigation behavior and touch usability, also read `.agents/skills/kidsfit-crm-webapp-ux/SKILL.md` and task-relevant references. For any business status, permission, contract, finance or data mutation, ALSO use the domain engineering skill and `docs/requirements/`; design instructions never supersede backend authorization. A user-provided screenshot is visual evidence, not a permission to change adjacent screens or business logic.
- For KidsfitCRM domain, schema, workflow, API, UI, architecture, security, or review work, use the repository skill at `.agents/skills/kidsfit-crm-development/SKILL.md` and load only its relevant references. Database work must also load `references/mysql-conventions.md`.
- For every CHECKEE, customer-protection, partner/CTV, contract, revenue, commission, payout, or reconciliation request, also load `.agents/skills/kidsfit-crm-development/references/checkee-sales-crm.md` before planning or editing.
- For school directory/import, branch, CTV capacity, assignment, proposal, extension, or school-contract verification work, also load `.agents/skills/kidsfit-crm-development/references/school-directory-workflows.md`.
- For workflows from `KidsfitCRM_Notes.docx`, also read `docs/implementation/CRM_NOTES_INSTRUCTIONS_AND_ISSUES.md`. Its `DRAFT` recommendations are proposals, not approved runtime rules. Keep its requirement matrix and verification evidence accurate when changing these workflows.
- Resolve conflicts in this order: current explicit user request, current accepted decisions in `docs/requirements/DECISION_LOG.md`, current requirements (intended behavior), verified code/schema/tests (actual behavior), then historical implementation notes and skill references. Surface migration gaps instead of silently treating legacy implementation as current policy. Call out breaking conflicts rather than silently choosing one.

## Product invariants

- Model guardians/parents as customers and students as separate entities connected by an explicit relationship.
- Keep course, class, trial session, enrollment, invoice, and payment as distinct concepts.
- Validate workflow transitions and permissions on the server.
- Make lead conversion atomic, traceable, and safe to retry.
- Use exact server-side money calculations and append-oriented payment/audit records.
- Record relevant activity/audit data with business mutations and send queued side effects after commit.
- In CHECKEE channel sales, keep canonical customer, approach registration/protection, contract, receipt, commission ledger, payout, and reconciliation as distinct concepts. An elapsed five-day protection never creates a signed contract.

## Engineering conventions

- Default to a modular monolith. Preserve module ownership and use named business actions for cross-record changes.
- Use MySQL 8.4 LTS with InnoDB and `utf8mb4`. Keep database access compatible with EF Core 10 and `MySql.EntityFrameworkCore`; avoid PostgreSQL-specific SQL, types, operators, and index features.
- Use English identifiers and stable machine codes; keep Vietnamese UI copy in localization/presentation resources.
- Do not add Redis, Reverb, S3/R2, SMS, Zalo, Firebase, or other operational dependencies until the requested feature needs them.
- Do not hard-code lead sources, localized status labels, role checks, tuition totals, or provider-specific values in business logic.
- Protect guardian/student PII and financial data in authorization, logs, audit payloads, fixtures, exports, and object storage.
- Follow existing project tooling once present. Do not replace package managers, formatters, test runners, or architectural patterns without an explicit migration request.

## Change workflow

- Inspect nearby code, tests, schema, and config before editing.
- Add or update tests for changed business rules, permissions, transaction rollback, and retry/concurrency behavior according to risk.
- Run the narrow relevant checks during development, then all configured checks for touched areas before handoff.
- Keep migrations backward-safe and deterministic. Never destroy production data merely to make a migration pass.
- Document material assumptions and unresolved product decisions in the handoff.

## Code review rules

- Flag partial or non-idempotent lead conversion, invalid status bypass, missing tenant/assignee scope, scattered role-name checks, floating-point money, destructive financial/audit edits, pre-commit external side effects, exposure of guardian or minor PII, PostgreSQL-only SQL, incorrect MySQL collation/type choices, and database behavior tested only on SQLite.
- Tie findings to concrete runtime or business impact and give the smallest safe remediation path.
