# Contract renewal, service-term reminders and Sales protection lifecycle

Status: **Multi-phase implementation in Draft PR #80; several finance/policy/production gates remain OPEN.**
Scope: School CRM (not education-center enrollment). Requirements agreed 2026-11-05.

## Implementation status — PR #80, updated 2026-11-05

This change now goes beyond the original Phase 1 and implements the following in **the PR branch only**:

- **Backend & MySQL 8.4:** additive EF entities, migration and snapshot for `contract_service_terms`, `contract_service_events`, and `contract_lifecycle_alerts`, plus an unrelated existing invitation response-reason widening needed for existing manager workflow tests.
- **Term workflow:** scoped Sales submission of actual annual service date range and monthly/yearly billing type; direct Manager review; CHECKEE verification; no new 5-year grant from re-signing. A Sales with expired long-term protection must re-register through the pre-existing `RegisterCustomerApproach` and newly verified contract workflow before a future protected cycle.
- **CRM alerts:** scheduled, recipient-scoped, deduplicated in-app reminders for term expiry D-30, D-15, D-7, D0, D+30; 6/11/12-month interruption; and approaching five-year entitlement expiry. Existing shared Header bell displays and acknowledges them. Old proposal alerts remain available.
- **12-month interruption:** guarded release after a *verified* service term has had no successor for 12 calendar months and no pending renewal or disputes; preserve contract, receipts, commission ledger and customer history. Service-term dates not evidenced by verification are not fabricated.
- **Screens:** reuses shared contract explorer in Sales/CTV, Manager, CHECKEE, CSKH, Accounting, BGĐ and Admin reporting. Not every earlier suggested screen is created as an independent route.
- **MySQL tests:** term verification chain, protection unchanged on routine renewal, 12-month release preserves history, scoped notification deduplication and re-registration after five-year expiry. **Do not claim full pass until the latest CI completes**.

**Items still requiring further approvals/engineering before production release:**
- Renewal documents currently use a required `EvidenceReference` string, not a new uploaded private attachment tied to the term.
- An explicit **term-level receivable/payment allocation** and commission eligibility/base/trigger on renewal are not implemented; do not create or distribute money automatically. Finance 30% rate alone is not sufficient authorization.
- Admin-configurable threshold and exception UI is not implemented; agreed reminder milestones are currently code-defined.
- Exhaustive parallel race/authorization coverage, exception handling for legacy data, migration rehearsal against a copied dataset and hands-on UX acceptance remain release gates.
- In-app notices are not external email/Zalo, and no message is sent to school directly.
- Current worker scans up to 10,000 latest verified terms per run; pagination must be implemented if production exceeds this threshold.

**Safety:** Do not apply the migration to a populated/shared/production DB or merge PR #80 without review and backup/restore. Do not equate "verified software service term" with "verified new five-year Sales protection."

## Non-negotiable distinct dates
1. Signed-on / effective-on are contractual dates already stored. Neither is proof of a one-year service expiry.
2. `service_end_on` is a *new, explicit* contractual service date, not currently stored.
3. `customer_protections.effective_until` is the expiry of an authorized KIDSFIT **granted** CONTRACT protection. Only an actual ACTIVE CONTRACT grant is displayed as current, not `sales_contracts.protection_until` populated during initial reporting.
4. Revenue schedule `due_on` is a payment due date, not service expiry.
5. Re-signing while within an active protection window does **not** reset its five-year anniversary.

## Roles and screens (planned, not all implemented)
| Role | Reuse screen | Function |
| --- | --- | --- |
| Sales/CTV | My schools / My contracts | View remaining protection days, actual service term, re-signing history; request new registration when allowed |
| Sales Manager | Contracts & verification | Review re-signing evidence, expiry watch, interruption queue, check release conditions |
| CHECKEE | Reconciliation/verification | Verify re-signed documentation and validate new cycle evidence |
| Customer care | Contracted customers/support | Record service use and renewal contact outcomes, handle interruptions |
| Accountant | Contracts & commissions | View service terms, payment schedule, net receipts, refund, per-term ledger; no automatic commission mutation |
| Directors | Oversight dashboard | Expiry, renewal and disputed-release KPI and exception decisions |
| Admin | CRM policy & audit | Configure reminder schedule, deadline policy, authorized grant actor and audit |
| Shared | Notifications | Per-recipient read/unread, deeplink, deduplication |

## Release 1 (this branch)
- Accounting contract detail API and Manager review detail API return nullable `protection_until` derived from ACTIVE `customer_protections` rows of source CONTRACT.
- Both existing drawers show this expiry separately from service expiry. Until `service_end_on` exists, UI says **Chưa quản lý riêng** rather than generating dates from signature, maintenance plan or due date.
- No schema mutation, automated alert, release, commission or ownership rewrite.

## Required release 2: additive data model and workflow
- Introduce `contract_terms` (id, customer_id, contract_id, previous_term_id nullable, starts_on, ends_on, payment_cycle, amount, status, verification reference, actor/audit fields), immutable predecessor relationship and nonoverlap constraints checked in MySQL transaction.
- Introduce `service_status_events` (customer, effective date, status, reason, actor) and derive interruption start only when all currently effective verified terms have ceased. An unresolved verification or contested renewal must block automated release.
- Introduce `protection_cycles` (customer, approved Sales/org, protection source/contract, start/end, KIDSFIT grant actor, outcome, predecessor) or extend `customer_protections` additively and safely with explicit cycle relationship; history append-only.
- Existing `revenue_schedules`, `revenue_receipts`, `revenue_refunds`, `commission_ledger_entries` and audit remain the financial truth. Terms may map to schedules but must never duplicate receipts.
- Backfill *only verified* historic terms with reliable signed documents. Uncertain service end dates remain null and are excluded from automated reminders/releases. Do not apply migration to shared/production databases without separate safety review.

## Required release 3: durable in-app notices
- Reuse `SchoolProposalAlertService` pattern (scoped readers, unique binary deduplication key, idempotent daily sweep, status/read tracking, transient failure retry). Do **not** overload `school_proposal_alerts` for contracts; use separate `contract_lifecycle_alerts` keyed by `contract_term_id, recipient_user_id, event_kind, deadline`.
- Authorized recipients: scoped Sales, direct scoped Manager, assigned CSKH; relevant outstanding payment may notify Accounting. Do not leak another partner's customer information.
- Contract term reminder milestones: D-30, D-15, D-7, D0, D+30.
- Interruption alerts: month 6, month 11, month 12 (release only after rechecking all prerequisites).
- Protection expiry: D-30, D0. All date arithmetic uses Asia/Ho_Chi_Minh business calendar; a daily sweep may be retried without duplicate notices.
- Late-entered service terms must not generate an uncontrolled backlog of historical alerts.

## Required release 4: registration and release safety
- At uninterrupted inactivity of **12 calendar months**, confirm no new verified active term, no pending contested renewal, no blocking dispute; lock customer, contract and active protection in one transaction; release registration atomically and audit. The previous 5-year protection may end *early* under this newly approved business rule; do not use `CancelSalesContract` as a shortcut because it also modifies finances and claims.
- At the end of five years, even if service continues, any Sales must **register again through the existing initial approach workflow**, recheck eligibility and 10-slot capacity. A new five-year cycle is recorded only after new valid verification and authorized KIDSFIT grant. No automatic extension; no preferential reservation for prior Sales unless explicitly approved.
- Keep prior activity, contact, evidence, verified contract, ledger, payouts and audit. New Sales receives history only under row-scope authorization, not a global data dump.
- Race tests: renewal simultaneously submitted at month 12, expired entitlement vs another Sales registration, two Sales acquiring same customer, stale request, payment/reversal during release.

## Required release 5: financial policy and cross-role UI
- Provide term-scoped receivables, paid/refunded balances and historical finance tabs in Accounting.
- Commission rate 30% is confirmed, **but base, trigger, tax, earned owner at renewal, clawback, activation date are OPEN**. Do not activate real automatic accrual or payouts based on assumptions.
- Retain historic owner and commission eligibility; newly registered Sales does not acquire prior earnings.
- Implement navigable screen filters, dashboard summaries, signed-document evidence and shared error/toast validation.

## Acceptance gate for later releases
- MySQL 8.4 integration tests and EF Core migration/snapshot consistency.
- 7-role permission and row-scope tests (including cross-organization boundaries).
- Distinguish ACTIVE service from ACTIVE 5-year protection in every API and dashboard.
- Reminder deduplication, repeat sweeps, 12-month calendar edge, leap years, signed documents with unavailable dates, CSKH reassignment, and re-registration under concurrency.
- No automated release on missing `service_end_on` or unreviewed financial/ownership history.
