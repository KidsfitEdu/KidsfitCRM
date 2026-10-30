# KidsfitCRM repository instructions

## Scope and sources of truth

- **Live code map (2026-10-30):** `docs/implementation/CURRENT_SOURCE_MAP.md`. UI source now lives in `frontend/src/`: Vinext routes `src/app/`, workspace/screens `src/screens/`, components `src/components/`, services `src/services/`. Do not follow deprecated paths such as `frontend/components/` or create parallel `frontend/app/` directories.
- **Phased delivery:** `docs/implementation/PHASED_DELIVERY_PLAN.md` is the execution framework; read `docs/requirements/` first for approved policy. Stages require baseline tests, explicit test DB isolation, additive migrations and actual evidence. Never delete working code merely to align names.
- **Data safety:** `--migrate` and `--seed-demo` are distinct; `start-local.ps1` and `compose.yaml` can trigger migration/seeding and must never be run blindly against databases containing real data. Database dumps are backups, not synthetic seeds.

## Scope and sources of truth

- For **current KIDSFIT/CHECKEE school-sales business requirements**, start at `docs/README.md`, then read the task-specific file under `docs/requirements/`. The current seven-role business model, 10-slot Sales limit, 5+7×3 protection, and Sales Manager→CHECKEE contract verification supersede historical product recommendations. This is a target specification, not a statement that code has been migrated.
- Compare any product requirement with `docs/requirements/CODEBASE_GAP_ANALYSIS.md`. Never silently delete legacy `BOARD`, `CHANNEL_SALES`, `PARTNER_ADMIN`, `PARTNER_COLLABORATOR` roles or historical/audit/financial data. Their technical code names may remain while business UI converges on seven roles.
- **OPEN**: the KIDSFIT actor who grants five-year protection after CHECKEE verification; commission 30% is provisional and its base/activation remain unapproved. Do not choose either implicitly.
- No referrer or personal referral-commission split feature is in scope.


- Implement only the user's requested slice. The product requirement is a baseline, not a request to scaffold the entire CRM.
- For **KidsfitCRM frontend design, layout, component styling, responsive behavior, accessibility or screenshot/UI review**, use `.agents/skills/kidsfit-crm-frontend-design/SKILL.md` and the relevant references plus `docs/design/FRONTEND_DESIGN_SYSTEM.md`. For any business status, permission, contract, finance or data mutation, ALSO use the domain engineering skill and `docs/requirements/`; design instructions never supersede backend authorization. A user-provided screenshot is visual evidence, not a permission to change adjacent screens or business logic.
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
