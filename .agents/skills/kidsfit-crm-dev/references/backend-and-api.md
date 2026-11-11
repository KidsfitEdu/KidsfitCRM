# ASP.NET Core backend engineering

Target stack: C#/.NET 10 ASP.NET Core Web API, EF Core 10 and MySQL 8.4, JWT Bearer with permission-based server authorization. Preserve repository modular-monolith design and current endpoint conventions.

- Inspect `Program.cs`, `Features/`, `Domain/`, `Infrastructure/KidsfitDbContext.cs`, DTO/contract definitions and relevant backend tests before coding.
- Controllers/endpoints: parse/validate input, authorize, delegate to named domain/application action, return correct HTTP status and clear typed responses; avoid duplicate feature business logic across endpoint variants.
- Use-case/action: state guards, business invariants, organization/manager/assigned-sales scope checks, transaction boundaries, audit, and orchestrated operations. Check BOTH role/permission and record-scope in backend; UI button hiding is not authorization.
- EF Core queries: inspect generated SQL and query shape; minimize N+1, choose projection, pagination and necessary indexes. Do not expose raw EF entities as broad public API contracts when they leak fields.
- Mutations across claim/contract/payment/audit need consistency. Row locking / version checks / unique indexes for contention; idempotency key for retryable financial/high-impact commands. Queue notifications AFTER commit.
- Money uses server-authoritative exact decimal or bigint VND representation; never float/double. Time instants in UTC, convert for display. Protect contact PII, financial information, JWT secrets and logs.
- Errors: stable status and public message, avoid internal exceptions or secret traces. Distinguish validation 400, unauthorized 401, forbidden 403, not-found 404, conflict 409 where appropriate based on project conventions.
- Follow existing tests and naming; do not add new libraries (Redis, queues, Firebase, Zalo integrations) unless task warrants and user approves technical scope.

## Critical business flows

- A SchoolProposal is not automatically an approved canonical School or a five-day protected claim.
- Registration of one free school creates one claim for one qualified Sales; transaction-check availability and capacity under concurrency. A CTV vs employee distinction should not bypass Sales quota.
- Sales reporting a signed contract is NOT CHECKEE verification; no five-year protection without verified result and approved KIDSFIT grant workflow.
- Payment records are separate from contract amount; refunds/adjustments preserve immutable historical trace. Do not calculate 30% official payouts while commission policy is OPEN.

## Read-model/API projections and KC-02/GI-01

- Project a **single original contract** per Accounting list row; a confirmed annual renewal is a related period, not a duplicate contract. Batch-load renewal and GI-01 summaries with authorized contract/customer IDs; avoid N+1 per table row.
- Filtering should apply before pagination and total counts, with separate authorization and record scope at every endpoint; plan query performance for large data sets.
- Distinguish a calendar threshold assessment (`THRESHOLD_REACHED`) from an actual `RELEASED` ownership decision, and do not use historical releases to override newer rights.
- For server-computed financial totals, name receipt/refund/face value/commission fields distinctly and document whether projections refer to **original contract**, **specific renewal**, or **lifetime customer**.
- KC-02 + GI-01 details and tests: [reference](kc02-gi01-accounting.md).