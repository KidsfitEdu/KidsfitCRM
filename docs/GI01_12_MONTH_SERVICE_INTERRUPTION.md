# GI-01 — Gián đoạn dịch vụ đủ 12 tháng

## Policy approved by KIDSFIT
- Start interruption on the day following the last valid inclusive service date.
- Count **12 calendar months** in the Vietnam business calendar, not 365 days.
- Send notifications at **30, 15, 7, 0** days before/at threshold.
- KC-02 renewal pending Accounting at threshold is an exception with an **approved configurable processing window**; never indefinitely reserve ownership.
- A renewal confirmed after a valid subsequent Sales registration must never silently revert ownership.
- Five-year protection expiry, SL-02 early application (30 days), and the old-owner priority (15 days) are separate policies.

## Implemented scope in PR #89
- Pure calendar assessment: `ServiceInterruptionPolicy` merges inclusive verified periods, detects gaps between confirmed terms and future terms, flags missing legacy data and historical gaps for review rather than retroactive revocation.
- `ServiceInterruptionService` aggregates verified service terms across all noncancelled active contracts for the same customer, checks existing protections/owners, unresolved disputes and pending Accounting renewals.
- An hourly `ServiceInterruptionWorker` locks the customer and protection rows and records a unique durable decision in `service_interruption_events`. The release action, if enabled, is in the same MySQL transaction. Financial records are never deleted or modified.
- Read APIs `GET /api/channel-sales/service-interruptions` and `/{customerId}` use the existing role and organization scope.
- Reuse NT-01 to emit de-duplicated reminders, including director notices on overdue/unconfigured exceptions.
- Shared Frontend panel embedded under Sales protection, Manager contracts, CSKH customers, Accounting contract tabs and Director overdue overview.
- Isolated `Seed:Gi01Scenarios` adds fictional GI01-DEMO-SCH0007..0010 to the disposable review fixtures; optional `Seed:Gi01SweepAfterSeed` simulates one actual safe release in CI.
- Unit tests and a new CI MySQL smoke test verify the demo release, pending Accounting protection and replay idempotency.

## Configuration and production gate
- `GI01:EnableAutomaticRelease=false` (**default OFF**). Must not enable without CI, MySQL concurrency tests, rollout decision and a configured exception workflow.
- `GI01:AccountingExceptionHours=0` (**default fail-closed**). A pending Accounting renewal becomes `EXCEPTION_CONFIG_REQUIRED` until the business approves a positive processing window; after the configured window passes it becomes `EXCEPTION_OVERDUE` and must be routed to BGĐ, **without automatically revoking on pending status**.
- `Seed:ReviewFixtures=true`, `Seed:Gi01Scenarios=true` are only valid on `Seed:DisposableDatabase=true`, nonproduction, isolated databases. `Seed:Gi01SweepAfterSeed=true` must NEVER be configured for ordinary production workloads.
- Do not merge/release automatically until CI on HEAD passes and real MySQL concurrency/authorization review is complete. Review the manual migration against EF snapshot before committing additional migrations.

## Important non-goals / follow-up hardening
- No new role; CHECKEE does not automatically approve yearly renewals.
- No backdating/automatic reclaim of protection from another Sales.
- Do not confuse an OPEN notification with a right.
- Historic contracts, ledger, receipts and commission entries remain available and immutable.
- Validate end-to-end role scope, MySQL concurrent release/register and alert resolution after resumption. This Draft PR is **not production authorization**.
