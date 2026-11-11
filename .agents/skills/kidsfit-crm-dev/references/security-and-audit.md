# Security, authorization, audit and data safety

## Trust boundary

- Authentication identity (JWT) is not business authorization. Check centralized permission **and** record/customer/organization scope for each read/write, including list filters, detail endpoints, evidence URLs, exports and batch aggregations.
- Permission badges and hidden buttons in React are usability only; authoritative decisions belong in the server action.
- Contract, school contact, Sales owner, individual payouts and school branches may have different visibility rules. Never join scope-restricted finance records to a broader table without restrictive authorization.
- Validate DTO shape, length, max page size, amount, dates, transitions and exception status. Use typed public error responses, no stack traces or secret details.

## Data integrity

- Payments/receipts/refunds/commission adjustments need append-oriented history, actor and timestamp; never overwrite historical ledger rows to make demo status look correct.
- Idempotent retry keys and database uniqueness constraints for submit/approve/confirm/record/release operations as relevant. Audit in same transaction as mutation; send notifications after successful commit.
- Release of 5-year Sales right and 12-month GI-01 status require **exact contract/right context** and historical proof. Never infer ownership transfer from dates or from unscoped status history.
- Use structured safe logs: status, operation, correlation/request ID, authorized opaque IDs where needed. Exclude contact phone, user secrets, Zalo private content, bank details, raw tokens, signed PDFs, data dumps.
- Use least-privilege accounts and HTTPS; never commit `.env`, files containing credentials, user-provided secrets or generated backups.

## High-impact operations

- `--migrate`, `--seed-demo`, `start-local.ps1`, Docker Compose jobs, mass deletes and exports can modify databases. Read code/config and identify **actual target DB** before executing. Demo fixture must use a disposable database and synthetic data.
- For destructive/production operations: require specific user authorization, scope, verified backup+restore approach, rollback or forward-fix plan, and maintenance considerations; prefer no-op dry run when possible.
- Never use real financial records in screenshots, sample docs, test fixtures or GitHub PR descriptions unless sanitized and approved.

## Review P0 examples

- Contract list omits organization scope and exposes another partner's customer.
- GI-01 release decision is derived only from `today >= threshold` without event/right state.
- Renewal confirmation can be called by a Sales user who merely has view access.
- Payment can be submitted twice because idempotency is UI-only.
- New migration truncates legacy accounts/audit records or test command targets a shared DB.