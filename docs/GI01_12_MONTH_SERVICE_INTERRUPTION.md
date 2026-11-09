# GI-01 — Service interruption after 12 calendar months (implementation notes)

## Approved policy
- The interruption starts on the calendar day after the final inclusive valid service day.
- Count twelve calendar months, not 365 days. Dates use the Vietnam business calendar.
- Warn at 30, 15, 7 and 0 days before the threshold.
- An Accounting-pending renewal at threshold is an exception with an explicitly configured deadline, not an automatic indefinite extension.
- A renewal confirmed after release does not retake a subsequent Sales owner's valid right.
- Five-year protection expiry and the 15-day old-owner priority are independent policies.

## Current increment
- `ServiceInterruptionPolicy` is a pure, side-effect-free calendar assessment. It accepts only verified original terms and Accounting-confirmed renewal terms; callers must perform that database filtering.
- The policy returns `MissingServiceTerm` for legacy/invalid term dates.
- It flags a previously completed >=12-month gap as `HistoricalThresholdRequiresReview` instead of retroactively revoking ownership.
- `ThresholdReached` merely reports calendar eligibility. It is NOT authorization to revoke protection. `CanAutomaticallyRelease` must not be used without all remaining database safeguards.
- Unit tests cover calendar boundaries, a future confirmed renewal, normal resumed service, historical gaps, missing dates and milestones.

## Release safety gates before enabling any worker
1. Re-read and lock the current customer row and protection record inside one MySQL transaction.
2. Aggregate service periods across all relevant valid contracts for the same school/customer; never assume a single contract is the whole picture.
3. Check cancellations, disputes, current owner, 5-year expiration, confirmed periods and pending KC-02 cases **again after acquiring locks**.
4. Pending Accounting cases require a configurable exception expiry. Do not auto-clear it without approved operational handling.
5. Persist an idempotent decision and immutable audit data; update the protection and customer availability consistently.
6. Ensure the registration path cannot race the release transaction, and ensure it respects SL-02/MG-01/KF-01 independently.
7. Save warnings with per-recipient deduplication; scope every dashboard/API query by organization and user.
8. Add MySQL integration, concurrency and permission tests before worker registration.

## Explicitly not yet implemented
No auto-revocation worker, schema migration, notification delivery, role-based UI or seed changes are activated in this increment. The branch is intentionally a Draft PR until these release gates are covered and tests pass.
