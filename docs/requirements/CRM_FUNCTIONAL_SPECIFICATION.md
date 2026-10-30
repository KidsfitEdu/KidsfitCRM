# CRM KIDSFIT / CHECKEE — Functional specification

**Version:** business baseline 2026-10-30. **Status:** Approved requirements + explicitly flagged OPEN items; not an implementation-complete declaration.
**Source:** CRM_Report(2).docx, CRM_Functional_Specification.docx and subsequent product decisions in this CRM discussion; legacy repo implementation records are separately tracked in `CODEBASE_GAP_ANALYSIS.md`.

## 1. Goal and scope

Manage canonical school/customer directory, proposal routing, school approach protection, Sales activity and pipeline, contract review/verification with CHECKEE, payments, personal commissions, post-sale handoff, audit and manager/director oversight. Protect data boundaries for KIDSFIT, CHECKEE and partner organizations.

**In scope:** seven business roles; directory/import; branch structure; Sales self-registration AND manager allocation; duplicate detection; first 5-day approach; approved extension 7 days × up to 3; contact timeline; sales stages; contract verification; protected owner after valid verification; multiple receipts; commission/payout views; handoff, escalation, audit.

**Out of scope:** personal referrer records and private referral split/payout; automatic transfers to bank; automatic Zalo personal-chat import; unapproved rule defaults, external integrations, and deleting legacy education-center CRM.

## 2. Seven business roles

| Code in **target business specification** | Role | Account scope |
| --- | --- | --- |
| `ADMIN` | Admin | KIDSFIT system administration and directory |
| `DIRECTOR` | BGĐ KIDSFIT | Company-wide oversight/exception decisions |
| `ACCOUNTANT` | Kế toán | Authorized financial and payout scope |
| `SALES_MANAGER` | Quản lý bán hàng | Assigned KIDSFIT or partner organization/team |
| `CUSTOMER_SERVICE` | CSKH | Assigned verified customer/support scope |
| `CHECKEE` | CHECKEE verifier | Authorized verification/reconciliation fields |
| `SALES` | Sales (employee **and** collaborator) | Own assigned/registered customers and scoped income |

This is the **target product model**. Legacy role codes (`BOARD`, `CHANNEL_SALES`, `PARTNER_ADMIN`, `PARTNER_COLLABORATOR`) still exist in code and must be transitioned without destroying history. See [roles](ROLES_AND_PERMISSIONS.md).

## 3. Business modules and actions

| Module | Functional scope | Main actor |
| --- | --- | --- |
| M01 Identity & authorization | Sign-in, membership, role/organization scope, user status, audit | Admin |
| M02 School directory | Excel preview/import, parent school/branch, search, contact access | Admin |
| M03 Proposals | Sales submits new school **to direct manager**, manager reviews/forwards, Admin accepts/rejects | Sales, Manager, Admin |
| M04 Registration/allocation | Self-register available school, manager invitation/allocation, accept/decline, duplicate/capacity control | Sales, Manager |
| M05 Activities/follow-up | Phone/Zalo/meeting/demo, timestamp, ward/district, school contact/position, needs, outcome, next action | Sales |
| M06 Sales pipeline | Track sales progress separately from three overall customer statuses | Sales, Manager |
| M07 Protection/extension | 5-day start, expiry, evidence-backed requests, 7-day manager approval, 3-approval cap, disputes | Sales, Manager, Director |
| M08 Contract verification | Sales report and evidence → Manager CHECKEE submission → CHECKEE verification → authorized KIDSFIT long-term grant | Sales, Manager, CHECKEE |
| M09 Receipts/receivables | Contract value, scheduled and multiple actual receipts, remaining balance, refunds and audit | Accountant |
| M10 Commissions/payout | Policy version, qualifying revenue, eligible commission, reconciliation, paid vs owed | Accountant, Sales |
| M11 Support/handover | Verified-contract CSKH handoff, support activities, reassignment and departing Sales handover | Manager, CSKH |
| M12 Oversight | Sales/partner KPI, queue, overdue, dispute, policy approvals, event logs | Director, Manager |

## 4. Detailed use-case contracts (required for implementation)

Use case output must include event/audit record and appropriate organization visibility. Errors return explicit reason; authorization must be enforced on the server.

### UC-SALES-01 Register school
Actor: `SALES`; preconditions: active membership; school exists in official directory and is AVAILABLE; no active protection; Sales has fewer than configured concurrent slots (default 10).
Action: query eligible schools → select → confirm → server atomically locks school/customer and membership capacity, rechecks eligibility, creates one protection for 5 days and history event. Output: ownership, registration timestamp, expiry and remaining capacity. Errors: already protected/contracted, lack of slot, unauthorized organization, concurrency conflict, duplicate request. Retry must not create two claims.

### UC-SALES-02 Accept manager allocation
Manager selects AVAILABLE school and eligible Sales in scope, sends invitation or assigned work per approved allocation mechanism; Sales accepts/declines where invitation is used. The **accepted** allocation counts as a protected slot and has the same conflict/capacity checks as self-registration. Declines require reason and do not create protected ownership.

### UC-SALES-03 Propose new school
Sales enters school name, type, location, available contact information and notes; submits **only** to own manager. Manager reviews for completeness/duplicates and forwards to Admin; Admin approves/returns/rejects and alone updates canonical directory. Proposal alone does not reserve approach rights. Provide full status timeline and feedback to proposer via manager.

### UC-SALES-04 Log interaction and pipeline
Record occurred_at, channel, locality (for example Ninh Kiều), school contact/title, discussion, needs, response, obstacle, evidence (where permitted), next action and due date; append subsequent activities without erasing history. Pipeline stages: NEW, CONTACTED, MET, CONSULTING, DEMO, NEGOTIATING, PENDING_VERIFICATION, WON/LOST as applicable. These stages are **not** the three overview statuses (AVAILABLE/APPROACHING/CONTRACTED). No activity automatically renews protection.

### UC-SALES-05 Request extension / UC-MGR-03 Review
Precondition: active protected approach before its expiry, supporting evidence and progress; request status/time recorded. Manager approves or rejects within their organization/team scope; each approval adds **7 days**; maximum **3 approvals per approach episode** (initial 5 + 3×7 = 26 days if all continuous). Reject fourth extension. Preserve earlier owner and subsequent owner claims; never overwrite the new legal owner after expiry. Unapproved pending-hold duration and overdue SLA remain OPEN: no indefinite automatic lock.

### UC-SALES-06 Report contract / UC-MGR-04 Submit to CHECKEE
Sales assembles contract identity, school, package, values, signature date, evidence and submitter. Direct Manager (KIDSFIT **or partner**) checks completeness and sends **directly** to CHECKEE; no routine Director or Admin approval gate. CHECKEE verifies or requests corrections; its valid confirmation is not a payment. Long-term protection is granted by an **authorized KIDSFIT actor** only afterward, for 5 years from valid CHECKEE verification. **OPEN:** who gets the KIDSFIT protection-grant permission since Admin is explicitly not part of daily contract handling; current implementation uses Admin (see gaps).

### UC-ACC-01 Record receipt / UC-ACC-02 Reconcile commission
Accountant records each actual paid installment (amount, date, method, transaction reference, approver). Display agreement total, actual collected, refunds and remaining receivable separately. Prevent duplicate receipts and over-collection; keep immutable financial/audit trail. Sales sees only own contract/payment and commission details permitted by scope. **30% is proposed for Sales**, not an active production rate until formally approved; qualifying base, payout trigger and withholding remain OPEN.

### UC-MGR-05 Handover / UC-CS-01 Post-contract care
On resignation/inactivation: manager reviews ownership, contacts, interactions, appointments and outstanding commitments; authorized administrative account actions suspend membership, revoke uncontracted protection per decision and reallocate; do not delete legitimate earned commissions. Verified customers are handed to scoped CSKH with read-access to required history; support actions are append-only.

### UC-DIR-01 Oversight
Director sees cross-scope KPI/overdue/dispute queues, resolves complaints, manager inactivity and policy exceptions with recorded decisions. Director **does not approve every contract**.

## 5. Status, data and acceptance conventions

Visible customer statuses: `AVAILABLE` (Chưa đăng ký); `APPROACHING` (Đang tiếp cận); `CONTRACTED` (Đã ký hợp đồng after required verification/grant). Contract review and verification remain separate from payment and commission. Do not infer a signed contract from an expired timer.

Core records: Organization/Membership; UserRole/Permission; CanonicalSchool + SchoolUnit; SchoolProposal; ApproachClaim + Allocation + Extension; SalesActivity; PipelineHistory; SalesContract + evidence + Verification; LongTermProtection; Receivable/Receipt/Refund; CommissionPolicyVersion + Ledger + Payout; CareHandover; SupportCase; Dispute; Audit.

Acceptance: verify authorization and row scopes, concurrent registration and capacity, 4th-extension denial, pending/expiry race, partner-manager CHECKEE submission, no pre-verification 5-year protection, multiple receipts, policy snapshot, financial history non-destructive updates, CSKH handoff, and rejected referrer features.

## 6. Implementation safety

The above is a **target contract**; source code is not automatically compliant. For every delivery compare current migrations, API permissions, frontend and MySQL tests against [codebase gap analysis](CODEBASE_GAP_ANALYSIS.md). Do not remove existing `PARTNER_ADMIN` and other legacy roles in-place. Current education-center features (parents/students/classes) form another bounded context and must remain intact.
