---
name: kidsfit-crm-development
description: Design, plan, implement, review, and test KidsfitCRM features using ASP.NET Core .NET 10, React, EF Core, and MySQL, including education-center operations and CHECKEE school directories/imports, customer protection, partner/CTV capacity, contracts, revenue, commissions, reconciliation, RBAC, APIs, schemas, and UI. Use only for this repository or when the user explicitly asks to apply the KidsfitCRM domain model.
---

# KidsfitCRM Development

Use this skill to keep implementation decisions aligned with the relevant KidsfitCRM bounded context while respecting the user's current task and the code that already exists.

## Start with the requested scope

- Inspect the relevant code, tests, schema, and repository instructions before proposing changes.
- Treat the requirement references as a product baseline, not as authorization to build every listed module.
- Preserve explicit user choices and established repository behavior. If the baseline conflicts with implemented behavior, surface the conflict before making a breaking change.
- Do not introduce infrastructure such as Redis, WebSockets, object storage, or external notification providers until the requested feature needs it.

## Load only the relevant reference

- Read [references/domain-workflows.md](references/domain-workflows.md) for entity ownership, relationships, statuses, workflows, schema decisions, or acceptance criteria.
- Read [references/checkee-sales-crm.md](references/checkee-sales-crm.md) for every request involving CHECKEE, KIDSFIT sales deployment, customer approach registration, five-day/five-year protection, partners/CTV, contracts, revenue, commissions, payouts, or CHECKEE reconciliation.
- Read [references/school-directory-workflows.md](references/school-directory-workflows.md) for school directories/imports, branches, CTV capacity, proposals, assignments, extensions, or school-contract verification based on the supplied PDF and Excel. Its new-school verification rule supersedes the older signed-date recommendation, not historical contracts.
- Read [references/engineering-conventions.md](references/engineering-conventions.md) for architecture, API, ASP.NET Core, EF Core, React, authorization, security, testing, or delivery decisions.
- Read [references/mysql-conventions.md](references/mysql-conventions.md) for database configuration, migrations, schema types, indexes, collation, JSON, transactions, locking, queries, or database tests.
- Read all relevant references when implementing an end-to-end business feature or reviewing a cross-layer change.
- Treat the education-center CRM and CHECKEE channel-sales CRM as separate bounded contexts. Do not reuse a similarly named status or table across them without an explicit mapping decision.

## Preserve these invariants

- A parent or guardian is the customer and primary contact; a student is a separate entity. Model their potentially many-to-many relationship explicitly.
- A course is the educational product; a class is a scheduled delivery of a course; an enrollment connects a student to a class.
- A lead remains traceable after conversion. Lead conversion is an idempotent, atomic business action that creates or links the parent, student, relationship, enrollment, and invoice as requested.
- Trial sessions and interaction history are first-class records, not fields flattened onto a lead.
- Validate lead and enrollment status transitions on the server. UI affordances never replace domain validation.
- Financial amounts use exact arithmetic, are calculated on the server, and are reconciled against immutable payment records.
- Business mutations record actor-aware activity or audit data in the same consistency boundary as the state change. Dispatch asynchronous side effects only after commit.
- Enforce permissions through centralized RBAC policies, not scattered role-name checks.
- Keep the system a modular monolith unless the user explicitly requests a different architecture.
- Use MySQL 8.4 LTS with InnoDB and `utf8mb4` as the database baseline; do not introduce PostgreSQL-specific SQL or schema features.
- For CHECKEE channel-sales work, keep the canonical customer, approach protection, contract, revenue receipt, commission ledger, payout, and reconciliation case distinct. Protection expiry never implies a signed contract.

## Implement a vertical business action

For a requested behavior such as assigning a lead, booking a trial, converting a lead, enrolling a student, or recording payment:

1. Name the business action and its preconditions, authorized actors, state transition, records changed, and failure behavior.
2. Put orchestration in one application action/use case; keep HTTP controllers and UI components thin.
3. Use a database transaction when the action changes multiple related records. Add locking or an idempotency mechanism when retries or concurrent requests could duplicate money or conversion records.
4. Emit activity, audit, and domain events deliberately. Queue notifications and integrations after the transaction commits.
5. Return an explicit resource/DTO shape and update cached client data predictably.
6. Test success, invalid transition, authorization failure, validation failure, rollback, and retry behavior in proportion to the action's risk.

## Review changes

Flag changes that can create partial conversions, bypass status rules or RBAC, duplicate a parent/student without an explicit matching policy, use floating-point money, delete financial/audit history, expose minor or guardian PII, or send side effects before commit. Provide a concrete safe path with each finding.
