# CRM business rules — authoritative decision index

**As of 2026-10-30.** `CONFIRMED` = accepted product rule; `PROVISIONAL` = discussed rate, not activated; `OPEN` = no sanctioned default. Do not turn `OPEN` or illustrative/demo numbers into active policy. Technical defaults in existing code are implementation observations only.

| ID | State | Rule and expected behavior |
| --- | --- | --- |
| BR-01 | CONFIRMED | Seven target roles; employees and collaborators are one **Sales** role, with optional personnel type. |
| BR-02 | CONFIRMED | Both Sales groups can self-register AVAILABLE schools or accept scoped manager allocation. |
| BR-03 | CONFIRMED | Both Sales groups have **10 simultaneous approach slots by default**, counting self-registration and accepted allocations. Admin can change individual quotas; history/reason required. |
| BR-04 | CONFIRMED | Reducing the quota below used slots does not revoke existing valid protections; it blocks new claims until below limit. Verified contracts and expired/released approaches free slots. |
| BR-05 | CONFIRMED | The first valid school approach protects for **5 days**. Existing implementation represents this as 120 hours; precise interpretation must remain consistent with adopted date policy. |
| BR-06 | CONFIRMED | Evidence-backed extension request before expiry; authorized direct Sales Manager decides; **7 days per approved extension, at most 3 per approach episode**. Max continuous entitlement: 5 + 3×7 = **26 days**. No auto-approval. |
| BR-07 | CONFIRMED | Once protection legally expires with no valid extension, school is available again. Previous effort does not beat a new valid registration. Do not overwrite new owner by processing stale request. |
| BR-08 | CONFIRMED | New-school proposal route: Sales → direct KIDSFIT/partner Sales Manager review/forward → Admin canonical update. A pending proposal is not automatic ownership. |
| BR-09 | CONFIRMED | Registration must reject active duplicates and race conflicts atomically, including two different schools submitted concurrently by Sales at quota. |
| BR-10 | CONFIRMED | Activities append timestamp, locality, channel, contact/title, needs, discussion, reply, next step and due date. A log does not extend ownership. |
| BR-11 | CONFIRMED | Overall customer states: AVAILABLE, APPROACHING, CONTRACTED; keep finer sales pipeline separately, and contract verification separately from collected cash. |
| BR-12 | CONFIRMED | Sales creates contract file → direct Manager (KIDSFIT **or partner**) reviews and sends **directly CHECKEE** → CHECKEE confirms valid/requests correction → authorized KIDSFIT actor records five-year protection from valid verification. Admin/Director are not routine intermediate approvers. |
| BR-13 | CONFIRMED | BGĐ KIDSFIT handles company oversight, policies, manager inaction, exceptions/disputes; no mandatory approval for every contract. |
| BR-14 | CONFIRMED | Multiple receipts are recorded individually, with due, collected, refunded, and outstanding sums distinct; Accountant reconciles commissions and payouts with versioned/append-only history. |
| BR-15 | PROVISIONAL | **Sales commission rate expected 30%**, for employee and collaborator; the governing base, trigger, taxes/withholding, exceptions and effective date require product/finance authorization. |
| BR-16 | CONFIRMED | **No referrer feature or individual referral split** is managed or paid by CRM. Exclude Referrer/ReferralSplit entities and UI/API. |
| BR-17 | CONFIRMED | Handover on Sales departure preserves contacts, activities, commitments, verified ownership and legitimately earned commission. |
| BR-18 | CONFIRMED | KIDSFIT operates CRM; CHECKEE verifies contracts and sees only assigned verification/reconciliation scope. |

## Open decisions that block specific runtime behavior

| OPEN ID | What must be decided | Safe implementation behavior now |
| --- | --- | --- |
| O-01 | Exact interpretation/time zone of 7-day extension and whether configured working/calendar days differ | Preserve explicit server timestamps; do not add silent additional grace |
| O-02 | Time-bounded pending extension hold, review deadline, and escalation SLA | Pending request does not grant indefinite protection; warn/route to authorized escalation without fabricated SLA |
| O-03 | Who at KIDSFIT performs **long-term protection grant** after CHECKEE verification, now that Admin is excluded from daily contract operations | Keep permission gated; do not automatically grant on CHECKEE confirmation or silently delegate it |
| O-04 | Commission 30% approval, **value of contract vs actual received**, thresholds, effective date, pay cycle, tax, refunds/clawback | Keep demo rates marked synthetic; block real payout policy activation without authorized version |
| O-05 | Parent school vs branches: scope of registration, quota and 5-year right in ambiguous contracts | Preserve current main-school mapping as documented technical behavior; flag business-policy uncertainty |
| O-06 | Proposal priority, invitation response, manager/Admin SLA, holidays and overdue escalations | No fabricated 24h/48h/7-day SLA |
| O-07 | Cancellation/refund authority, revocation date, exception handling for prior paid commission | Record reversal/adjustment separately; do not silently destroy original ledger |
| O-08 | Any new cross-partner visibility and delegation to manager/CSKH | Default deny beyond existing authorized scope |

## Boundaries

Money is decimal/integer on server (VND) and never floating-point. Financial, security, contract and claim audit must be append-oriented. Product approvals do not authorize destructive rewrite of historical contract protection, demo datasets, existing paid commissions or real customer records. All checks enforced in backend and tested on MySQL.
