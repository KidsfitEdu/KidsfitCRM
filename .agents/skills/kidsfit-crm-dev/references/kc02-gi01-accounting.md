# KC-02 / GI-01 / Accounting / Sales five-year protection

**Baseline:** verified in repository code and prior accepted scope on 2026-11-11. **Re-read HEAD before changes.** This document distinguishes product decisions from the runtime implementation and supersedes older 2026-11-06 handoff assumptions if code/approved policy changed.

## Business concepts (do not flatten)

| Concept | Source of truth | Must not be confused with |
|---|---|---|
| School/customer | Canonical school plus main/branch relationships | Contract record or renewal occurrence |
| Original verified contract | CHECKEE-verified sales contract | Any annual renewal |
| Annual renewal | One separately signed service period/decision (`contract_renewals`) | A new original contract or another 5-year right |
| Service timeline | Original term + **CONFIRMED** renewal periods | Pending proposal, unverified future time, financial billing schedule |
| Cash receipts/refunds | Append-oriented financial records | Contract face value |
| Commission ledger/payout | Recorded entitlements vs actual payout | Collected cash or renewal amount |
| GI-01 assessment | Calendar evaluation of service interruption | Actual release decision in event/protection state |
| Sales protection | 5-year ownership period + renewal logic | Duration of annual software service |

## KC-02 — annual renewals

- Sales submits signed annual renewal to Accounting; Accounting can **confirm**, **request information**, or **reject** under server permission and scoped contract.
- On confirmation, new **service period** joins chronological timeline. Retain original contract and all previous renewals. Display each original contract **once** in the main Accounting table. Present all yearly renewals inside its detailed Drawer, including pending/confirmed/rejected/needs-information records.
- A period confirmed for the future is not already active today; preserving gaps and end dates matters for GI-01.
- Payment by month/year is a **payment cycle**, not a reason to duplicate the original contract or grant five-year ownership. The 30% rate decision does not approve live payout arithmetic.

## Five-year Sales protection and recent code

- Original contract protection follows valid CHECKEE verification and the authorized KIDSFIT flow. The owner role for manual grant is still an `OPEN` decision in the requirements; check actual server permissions before modifying.
- Current `AutomaticProtectionRenewal.cs` and `ProtectionRenewalPolicy.cs` implement a special renewal process around the **end of an existing five-year boundary**, using Accounting-confirmed service periods and continuity checks. Confirm the specific prerequisites from code/tests before edits.
- **Do not create a second manual 5-year approval form** merely because a renewal happened. Current workflow intentionally avoids routine manager approval for this automatic boundary case.
- `ProtectionRenewalPolicy.PriorityDays` is currently **15** for original-Sales priority handling in the corresponding flow. Do not extend this indefinitely for pending Accounting cases or confuse it with the 12-month GI-01 clock.
- Cancellations, disputed ownership, valid newly acquired Sales rights and rights released from old cases require explicit history-aware checks. Never auto-restore a released historical owner.

## GI-01 — 12 calendar months

- Count from the **next calendar day** after the last Accounting-confirmed service term ends; use the **Vietnam business date / Asia/Ho_Chi_Minh** and **12 calendar months**, not 365 days. Existing `ServiceInterruptionPolicy` has tests.
- Existing warning milestones: **30, 15, 7 and 0 days** before the threshold. This is an alert boundary, not permission to release.
- A `THRESHOLD_REACHED` assessment means **the calendar threshold is reached**, not that Sales protection has been released.
- `ServiceInterruptionService` may produce `REVIEW_REQUIRED`, `EXCEPTION_ACCOUNTING`, `EXCEPTION_DISPUTE`, `EXCEPTION_OWNERSHIP`, `EXCEPTION_CONFIG_REQUIRED`, `EXCEPTION_OVERDUE`, or `RELEASED`. Pending Accounting exception SLA remains configuration-dependent; do not invent a value.
- `GI01:EnableAutomaticRelease` is a runtime switch; if disabled or prerequisites fail, show **review/exception** rather than claiming a release. Actual release requires a valid decision/effect on the specific right and its audit event.
- A later confirmed renewal must not erase a **historical 12-month gap**, retroactively revoke a new legitimate Sales owner's right or claim that old RELEASED means all future rights are gone.

## Accounting unified workspace — current UI baseline

- One main list by original contract, **8 columns**: Nhà trường, Sales phụ trách, Kỳ sử dụng, Dịch vụ, Cần xử lý, Thanh toán, Hoa hồng, Thao tác. Do not display school ID/code under school name.
- **Dịch vụ** shows a descriptive badge and, when relevant, the threshold date: Đang sử dụng; Sắp hết hạn; Gián đoạn; Đủ 12 tháng; Quá 12 tháng; Đã hết bảo vệ; Cần rà soát. Exactly at threshold is “Đủ”; later and not released is “Quá”. The badge does not perform any release.
- **Cần xử lý** represents Accounting-only tasks: Xác nhận tái ký, Kiểm tra kỳ dịch vụ or `—`. Do not imply Accounting itself may reassign Sales rights.
- Kidsfit-branded badges: service colors semantic (green/yellow/orange/pink/red/neutral/violet), action colors separate (sky-blue for confirmation, violet for review). Prefer shared `AppStatusBadge` with opt-in variant so other roles remain unaffected.
- **Thanh toán**: label above value, “Giá trị hợp đồng” = original contract amount; “Thực thu” = completed receipts minus refunds **in the current original-contract projection**. Clearly state the scope; don't silently represent this as lifetime total over all renewals.
- **Hoa hồng**: label above value “Hoa hồng ghi nhận”; never label ledger accrual as “Đã chi” unless payout status independently proves it.
- A single detailed Drawer holds verification evidence, pending review actions, timeline, financial schedules, receipts, ledger, payouts and GI-01 history. Preserve existing mutating permissions; a GUI-only guard is insufficient.

## Mandatory regression scenarios

1. One source contract + multiple confirmed/pending renewals → one main row; list filtered/paginated without duplicates.
2. Future renewal does not turn on prematurely; historical service gap remains auditable.
3. 12-month threshold **yesterday vs today vs tomorrow** maps to “Quá”, “Đủ”, “Gián đoạn”.
4. A `RELEASED` historical event while a new protection is `ACTIVE` must not show “Đã hết bảo vệ”.
5. Pending Accounting renewal, dispute, exception, missing service terms and `GI01:EnableAutomaticRelease=false` must not silently release.
6. Financial receipts/refunds, commission accrual and payout remain separate and auditable.
7. Server-side permissions and customer/contract scope apply to **every endpoint** and aggregate; no N+1 per row for GI-01.
8. Dark/light colors, keyboard navigation and readable texts at desktop/mobile; do not use a screenshot to claim real API correctness.