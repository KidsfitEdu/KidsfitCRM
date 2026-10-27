# KidsfitCRM repository instructions

## Scope and sources of truth

- Implement only the user's requested slice. The product requirement is a baseline, not a request to scaffold the entire CRM.
- Current product scope is intermediary registration/distribution of iSchool and F&B products. Read `docs/PRODUCT_SCOPE.md` before UI or domain planning. Do not expose student, class, tuition, trial or education-enrollment features in the current application. Preserve historical education data; the education invariants below apply to that legacy context only.
- For KidsfitCRM domain, schema, workflow, API, UI, architecture, security, or review work, use the repository skill at `.agents/skills/kidsfit-crm-development/SKILL.md` and load only its relevant references. Database work must also load `references/mysql-conventions.md`.
- For every CHECKEE, customer-protection, partner/CTV, contract, revenue, commission, payout, or reconciliation request, also load `.agents/skills/kidsfit-crm-development/references/checkee-sales-crm.md` before planning or editing.
- For school directory/import, branch, CTV capacity, assignment, proposal, extension, or school-contract verification work, also load `.agents/skills/kidsfit-crm-development/references/school-directory-workflows.md`.
- For workflows from `KidsfitCRM_Notes.docx`, also read `docs/CRM_NOTES_INSTRUCTIONS_AND_ISSUES.md`. Its `DRAFT` recommendations are proposals, not approved runtime rules. Keep its requirement matrix and verification evidence accurate when changing these workflows.
- Resolve conflicts in this order: the current user request, accepted product decisions and tests, existing code/schema contracts, then the baseline skill references. Call out breaking conflicts rather than silently choosing one.

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
