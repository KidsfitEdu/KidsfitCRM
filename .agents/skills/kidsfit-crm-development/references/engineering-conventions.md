# KidsfitCRM engineering conventions

Use these conventions when implementing or reviewing the education-center CRM. Existing project configuration wins where it has already made a deliberate choice.

## Contents

- Architecture baseline
- Module boundaries
- Naming and language
- Persistence boundary
- API conventions
- Backend conventions
- Frontend conventions
- Authentication and authorization
- Events, queues, realtime, and notifications
- Security and privacy
- Testing and delivery

## Architecture baseline

The recommended initial architecture is a modular monolith:

```text
React + TypeScript + Vite
        -> REST API
ASP.NET Core Web API + .NET 10 + EF Core 10
        -> MySQL 8.4 LTS (InnoDB)
Optional adapters: Redis, S3-compatible storage, Reverb, email, Zalo, SMS, Firebase
```

- Treat versions as the product baseline; do not silently upgrade or downgrade them when scaffolding.
- Use EF Core 10 with the Oracle `MySql.EntityFrameworkCore` provider and framework migrations as the persistence integration layer.
- Redis and distributed queues are optional for the MVP. Introduce them only when requested throughput, latency, scheduled work, or multi-instance requirements justify the operational dependency.
- Store file bytes in S3-compatible object storage when attachments are in scope; store metadata and object keys/URLs in MySQL.
- Do not split modules into microservices without concrete scaling, ownership, isolation, or deployment requirements.
- The deployment baseline is Docker behind Nginx on a Linux host, with GitHub Actions for CI/CD. Add concrete deployment files only when deployment is in scope and the target environment is known.

## Module boundaries

Use business-oriented modules such as:

```text
auth
crm
customer
student
course
enrollment
billing
transport
notification
reporting
```

Rules:

- A module owns its domain writes and invariants.
- Cross-module work goes through named application actions/contracts, not direct writes into another module's tables from controllers.
- Share identity, authorization, time, money, files, and event primitives deliberately; do not create a generic `common` dumping ground.
- Keep transport/GPS and provider integrations behind adapters so the core CRM does not depend on vendor payloads.

## Naming and language

- Use English for code identifiers, database names, API fields, machine status codes, events, logs, and tests.
- Use Vietnamese for user-facing copy unless product requirements specify another locale. Keep labels in localization resources rather than business branches.
- Use plural `snake_case` table names and `snake_case` columns. Follow framework conventions for foreign keys such as `parent_id` and timestamps.
- Name business actions with verbs: `AssignLead`, `BookTrial`, `ConvertLead`, `RecordPayment`.
- Name past-tense domain events: `LeadAssigned`, `TrialBooked`, `LeadConverted`, `PaymentRecorded`.
- Use stable uppercase machine codes for statuses and permissions; never use display labels as persisted control values.
- Avoid ambiguous `status`, `type`, or `code` values without a defined enum/catalog and module context.

## Persistence boundary

- MySQL is the source of truth for CRM relational data. Read [mysql-conventions.md](mysql-conventions.md) before changing configuration, migrations, data types, indexes, collation, JSON, transactions, locking, queries, or database tests.
- Add foreign keys and indexes for actual lookup/join paths. Index lead status, assignee, source, next follow-up, phone search representation, class/course links, enrollment student/class, and invoice/payment relations when those fields exist.
- Encode uniqueness only when the domain guarantees it. Internal generated codes are unique; guardian phone numbers and student names are not necessarily unique.
- Normalize phone numbers for search/deduplication while retaining a display form. Matching a duplicate must not silently merge records.
- Use exact MySQL `DECIMAL` or integer whole-unit representations for money; never binary floating point. For VND, document whether the chosen representation stores whole dong.
- Store absolute instants in UTC and render them in the center's configured timezone. Treat recurring class weekday/start/end as local schedule data rather than UTC instants.
- Keep `created_at`/`updated_at`; add actor attribution where business accountability requires it.
- Prefer status changes, reversals, and archived/soft-deleted master data over destructive deletion. Audit and financial records are append-oriented.
- Migrations must be deterministic and safe for existing data. For a required new column, prefer add nullable/default, backfill, then enforce—not an unsafe one-step change.
- Wrap multi-record invariants in a database transaction. Use row locking or optimistic concurrency for capacity, conversion, invoice balance, and other contested writes.

## API conventions

- Use `/api/...` resource routes for ordinary CRUD and named action routes for business behavior.
- Baseline resource examples:

```text
POST /api/leads
GET  /api/leads
GET  /api/leads/{lead}
PUT  /api/leads/{lead}
```

- Baseline action examples:

```text
POST /api/leads/{lead}/assign
POST /api/leads/{lead}/activities
POST /api/leads/{lead}/follow-up
POST /api/leads/{lead}/trial
POST /api/leads/{lead}/convert
```

- Prefer nouns for resources and verbs only where the endpoint represents a command. Follow established URI/versioning conventions if the repository already has them.
- Validate input at the boundary, authorize the specific action, and re-check domain invariants in the application/domain layer.
- Return consistent resource envelopes, errors, pagination, filtering, and sorting. Do not expose raw ORM models or exception messages.
- Use appropriate HTTP semantics: `201` for created resources, `204` for a successful no-content response, `404` for hidden/missing resources, `409` for state/concurrency conflicts, and `422` for validation failures unless the established API contract differs.
- Require an idempotency key or equivalent server-side deduplication for retry-prone conversion, external callbacks, and payment commands.
- Paginate list/timeline endpoints and whitelist filter/sort fields.

## Backend conventions

For ASP.NET Core and EF Core:

- Keep controllers focused on HTTP adaptation.
- Use typed request DTOs and centralized validation/error contracts at the HTTP boundary.
- Put each complex mutation in a named action/use-case class with an explicit transaction boundary.
- Use authorization policies backed by permission claims for resource/action authorization.
- Use EF Core relationships for navigation, but keep cross-module orchestration out of entity hooks and persistence interceptors.
- Prefer explicit enums/value objects for statuses, money, phone normalization, and other concepts that carry rules.
- Use response DTOs/projections for stable API contracts.
- Dispatch events/jobs after commit when handlers depend on committed state.
- Make queued jobs retry-safe and include a bounded failure strategy. Do not assume exactly-once queue delivery.
- Avoid generic repository/service layers that only proxy `DbContext`. Add abstractions when they protect a real domain boundary or external dependency.
- Avoid hidden writes in accessors, observers, or serialization.

## Frontend conventions

For React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, and Zod:

- Organize application code by business feature, with shared primitives kept small and dependency-light.
- Keep server state in TanStack Query. Do not mirror query data into global/local state without a clear editing or projection need.
- Centralize query keys and invalidate/update all affected views after mutations, including dashboard counts and timelines.
- Use React Hook Form for form state and Zod for boundary validation. Server validation remains authoritative.
- Generate or define typed API contracts in one place; do not hand-maintain conflicting shapes across screens.
- Keep page/components declarative; put mutation orchestration in feature hooks/services.
- Use shadcn/ui components as accessible primitives and preserve keyboard behavior, labels, focus management, loading states, and errors.
- Treat Kanban drag-and-drop as a request to perform a status transition. Revert or reconcile optimistic UI when the server rejects it.
- Format money, dates, names, and phone numbers at presentation boundaries using locale/timezone-aware utilities.
- Avoid exposing permissions only through hidden buttons; the API must enforce them. The UI should still hide or disable unavailable actions to reduce confusion.

## Authentication and authorization

The baseline backend uses ASP.NET Core JWT Bearer authentication for the first-party React client. Keep tokens short-lived, validate issuer/audience/signature/lifetime, and authorize business actions with stable permission claims rather than role-name branches.

Suggested roles include:

```text
SUPER_ADMIN
ADMIN
SALES_MANAGER
SALES
ACCOUNTANT
TEACHER
TRANSPORT_STAFF
```

Permissions are capability-oriented, for example:

```text
crm.lead.view
crm.lead.create
crm.lead.update
crm.lead.assign
crm.report.view
student.view
student.update
course.view
course.manage
payment.view
payment.create
```

- Use roles to group permissions; authorize actions by permission/policy.
- Scope queries as well as mutations. A sales user who may see only assigned leads must not retrieve others through list, export, search, or nested endpoints.
- Audit role/permission changes and sensitive exports.

## Events, queues, realtime, and notifications

- Domain/database state is authoritative; events describe facts that already committed.
- Use synchronous in-process handling for invariants that must succeed atomically.
- Use queues for retryable side effects such as email, Zalo, SMS, Firebase, document generation, and reminders.
- Use an outbox or equivalent durable handoff when losing an integration event would be materially harmful.
- Realtime messages are projections. Clients must be able to refetch authoritative state after reconnecting.
- Keep provider-specific payloads, credentials, retry rules, and webhook verification in adapters.

## Security and privacy

The system processes guardian PII, children's data, financial data, and staff actions.

- Collect and expose only fields needed for the user's role and task.
- Never place passwords, tokens, full payment credentials, or sensitive personal data in logs, URLs, analytics events, notification previews, fixtures, or screenshots.
- Redact or minimize before/after audit payloads for secrets and especially sensitive fields.
- Validate file type, size, authorization, and object ownership for uploads/downloads; prefer short-lived signed URLs for private objects.
- Rate-limit authentication, public lead capture, OTP, webhook, export, and other abuse-sensitive endpoints.
- Protect against mass assignment and insecure direct object reference; resource lookup must respect tenant/branch/assignee scope if those concepts are introduced.
- Define retention and export/deletion behavior before implementing destructive privacy operations; financial/audit retention may override ordinary deletion.

## Testing and delivery

Use the repository's configured commands. Once the corresponding tooling exists, quality gates should cover formatting, static analysis/type checking, automated tests, and production builds.

Prioritize tests for:

- lead transition rules, including `LOST`/reopen behavior;
- assignment scope and permissions;
- trial booking and attendance/result transitions;
- lead conversion success, rollback, concurrency, and retry/idempotency;
- guardian/student relationship behavior and duplicate matching decisions;
- class capacity and enrollment transitions;
- invoice arithmetic, partial payment, overpayment policy, reversal/refund, and concurrent payment attempts;
- audit/activity creation and post-commit event dispatch;
- dashboard date boundaries, ownership scope, and timezone behavior;
- unauthorized access to minors' and guardians' data.

Prefer backend feature/integration tests for business actions, focused unit tests for pure domain rules, frontend component tests for interaction states, and a small number of end-to-end tests for the critical journey from lead through payment.

Database integration tests must run against the supported MySQL version for migration, collation, JSON, locking, and transaction behavior. SQLite may be used only for tests that are demonstrably database-agnostic.

Before handoff:

1. Run the narrowest relevant tests during iteration.
2. Run configured format, lint/static analysis, type-check, and build/test commands for touched areas.
3. Review migrations and API compatibility.
4. Document any unresolved product decision instead of inventing silent behavior.
