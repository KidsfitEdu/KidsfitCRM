# KIDSFIT / CHECKEE CRM business fences

Source: user-provided `CRM_Functional_Specification.docx` (2026-10-30), `CRM_Report.pdf`, plus current repository requirements. Documents differ in scope/vintage: the detailed specification targets 7 RBAC roles and explicitly classifies policies CONFIRMED/PROPOSED/OPEN; earlier report contains 8 business-facing rows. Prefer approved `docs/requirements/DECISION_LOG.md` from current develop and report discrepancies.

## Confirmed target rules

- Seven roles: `ADMIN`, `DIRECTOR`, `ACCOUNTANT`, `SALES_MANAGER`, `CUSTOMER_SERVICE`, `CHECKEE`, `SALES`. SALES combines employee and CTV via membership/type rather than independent roles; managers can belong to KIDSFIT or partners, but scope is constrained.
- Admin imports canonical schools and school/branch relationships; Sales proposes missing schools to assigned Sales Manager, who reviews and forwards to Admin. A proposal is not a five-day protected claim.
- Sales self-register or manager-allocated school consumes one concurrent slot; default **10**; Admin may change individual capacity and must record actor/time/reason. Lowering below current active claims does not revoke them automatically.
- Initial protected approach **5 days**, manager-approved extensions **7 days per approval**, up to **3** per claim with evidence. Expired claims without valid extension return to pool; a later valid claimant receives rights under policy. Avoid holding pending extension forever without approved SLA.
- Sales activities are append-oriented, including occurred time, channel (work contact/Zalo), contact, district, feedback, outcome, next step; don't rely on transferring personal Zalo history.
- Contract: Sales creates → manager (KIDSFIT/partner) reviews and sends directly to CHECKEE → CHECKEE verifies → authorized KIDSFIT process records 5-year customer protection from VERIFIED timestamp → accounting/CSKH. No ordinary Admin/Director preapproval step. CHECKEE sees only verification scope and does not own commission.
- Canonical school overview has three statuses: Chưa đăng ký, Đang tiếp cận, Đã ký hợp đồng; detailed sales stages separate. Verify whether 'signed' needs valid CHECKEE verification before moving summary status.
- Payments can have several installments, auditable refunds and balances; no destructive edits to commission ledger or financial records. No referrer/referral split module.

## OPEN / PROPOSED — do NOT hardcode

- **30% Sales commission rate is CONFIRMED** for employees and collaborators (D-10 / BR-15). Calculation base, trigger, taxes/withholding, payout cycle, clawback, exception handling and production effective policy are still OPEN (D-11). Do not activate live payout calculations just from the rate.
- Who at KIDSFIT activates customer protection after CHECKEE verification; do not default this action to Admin or Director.
- Pending extension temporary protection SLA; do not arbitrarily pick 24/48h.
- Protection scope of main school vs branches; keep relation but don't implicitly grant all campuses.
- Priority of Sales proposal before school accepted, integration with external CHECKEE data, SLA of proposal/verification, KPI periods.

For each feature map Use Case + Business Rule + acceptance test from current official documentation. In doubt, implement only safe storage/UI placeholders and flag blocked policy decisions.

## Implementation refinements verified after 06/11/2026

- The 2026-11-06 KC-02 handoff still describes an earlier *manual Sales re-registration* concept; the current automatic five-year boundary logic may differ. Always check `AutomaticProtectionRenewal.cs`, `ProtectionRenewalPolicy.cs`, the relevant endpoint tests, and approved changes before coding. Do not reproduce old screenshots/tabs as required UI.
- Confirmed GI-01 milestone: 12 calendar months after gap begins on the next day following a confirmed service term, with 30/15/7/0-day warning milestones and explicit audit, exception and release semantics. See [KC-02 / GI-01](kc02-gi01-accounting.md).
- The repo `AGENTS.md` and some design/gap documents may still use “30% provisional” loosely. The **rate** is confirmed, whereas the **operational payout formula** is not; never silently pick either extreme.