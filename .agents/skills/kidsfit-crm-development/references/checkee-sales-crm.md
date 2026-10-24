# CHECKEE sales CRM product reference

Read this reference for every request involving CHECKEE, KIDSFIT sales deployment, customer registration, customer ownership/protection, partners/CTV, contracts, revenue, commissions, payouts, or CHECKEE reconciliation.

This is an accepted product baseline, not authorization to implement every module. The current user request and accepted decisions/tests still take precedence.

## Contents

- Product objective and terminology
- Initial customer data and visible statuses
- Customer-protection rules
- Accounts, organizations, and data scope
- Sales, contract, revenue, and commission workflows
- Suggested domain model and API actions
- Acceptance criteria
- Decisions still requiring confirmation

## Product objective

KIDSFIT needs a CRM for teams and partners selling/deploying CHECKEE software. A salesperson or CTV registers a customer before approaching them. The system prevents overlapping claims during a five-day approach window. When a contract is signed, the system records the sale and protects ownership for five years. Internal teams, partners, and CHECKEE then use scoped views to operate, reconcile, support, and pay commissions.

## Terminology and separation of concepts

Keep these records separate:

- `Customer`: the canonical person or organization being approached.
- `Approach registration` / `protection claim`: a time-bounded right to approach one customer.
- `Activity`: call, meeting, note, proposal, or other evidence of progress.
- `Contract`: signed commercial agreement and its effective dates.
- `Product package`: the CHECKEE package/items selected in a contract.
- `Revenue receipt`: money actually collected; do not infer collection from contract signing.
- `Commission policy version`: the rule in force for a scoped organization/product/time range.
- `Commission entry`: an immutable accrual, adjustment, reversal, approval, or payout ledger entry.
- `Reconciliation case`: CHECKEE confirmation or dispute about a customer/contract/protection right.

Do not flatten protection, contract, revenue, and commission into one customer status or one mutable total.

## Initial customer data

The requested label “Chưa đăng ký” only makes sense for a customer already present in a searchable directory. Use both of these entry paths:

1. Import/synchronize an initial customer directory from an agreed KIDSFIT/CHECKEE source when available.
2. Allow just-in-time creation during approach registration when no canonical customer exists.

Before creating a customer or protection claim, normalize and check identifiers inside the same transaction:

- Organization: tax code is the strongest default identifier.
- Person/household: normalized phone is the strongest available default, subject to product confirmation.
- Supplemental identifiers: email, website domain, CHECKEE customer code, legal name, address, and representative.

Never silently merge fuzzy matches. Show possible duplicates and require an authorized user to resolve them. A newly created provisional customer should receive protection immediately after the server passes the exact-identifier conflict check; later verification must not create a race for ownership.

Suggested initial data fields:

- Customer type: organization or individual.
- Legal/display name.
- Tax code when applicable.
- Normalized phone plus display phone.
- Email and website/domain when known.
- Province/district/address.
- Contact person and position.
- Source and notes.
- CHECKEE customer code when supplied by CHECKEE.
- Creator, organization, created time, verification state, and audit metadata.

## Visible customer statuses

The UI may show the requested three statuses, but calculate them from separate lifecycle and protection records:

| Machine code | Vietnamese label | Definition | Registration behavior |
| --- | --- | --- | --- |
| `AVAILABLE` | Chưa đăng ký | No active approach protection applies. The customer may still exist in the directory. | An authorized actor may register an approach. |
| `APPROACHING` | Đang tiếp cận | An active protection claim exists and `protected_until` is in the future. | Only the owner and permitted managers can work the claim; others are blocked. |
| `CONTRACTED` | Đã ký hợp đồng | A valid signed contract has been recorded. | The protected owner is exclusive for five years from the agreed protection start date. |

Maintain internal workflow statuses independently:

- Customer lifecycle: `PROSPECT`, `CONTRACTED`, `INACTIVE`.
- Approach registration: `ACTIVE`, `EXPIRED`, `CONVERTED`, `CANCELLED`, `REJECTED`.
- Contract: `DRAFT`, `PENDING_CONFIRMATION`, `ACTIVE`, `EXPIRED`, `CANCELLED`.
- Reconciliation: `PENDING`, `CONFIRMED`, `DISPUTED`, `RESOLVED`.

### Corrected interpretation of the five-day rule

The source note says that after five days without a signature the customer becomes “đã ký hợp đồng”, while also saying another salesperson may register the customer. These statements conflict.

Use this recommended rule until the product owner decides otherwise:

- At `protected_until`, an unsigned `ACTIVE` approach registration becomes `EXPIRED`.
- The visible customer status becomes `AVAILABLE` unless another active protection or signed contract exists.
- A customer becomes `CONTRACTED` only through the explicit, authorized contract-reporting workflow.

Never mark a contract as signed merely because a timer elapsed.

## Customer-protection rules

### Register an approach

`RegisterCustomerApproach` must be one atomic, retry-safe server action:

1. Resolve or create the canonical customer.
2. Lock the authoritative customer/identifier rows.
3. Expire any elapsed claim according to server time.
4. Reject the request if another active five-day claim or protected contract applies.
5. Create the claim with `registered_at` and `protected_until = registered_at + 5 days`.
6. Record owner user, owner organization, actor, source, idempotency key, and audit/activity evidence.

Use server UTC time for all instants. Display the countdown in the configured business timezone. A browser countdown is informational only.

Recommended first-owner rule: the earliest successfully committed eligible registration wins. Database uniqueness/locking must enforce it; request arrival order in the UI is not authoritative.

### During the five-day window

- Only the owner, an authorized manager in scope, and administrators may update the claim.
- Record contact activity and next follow-up separately from the claim.
- Do not silently extend the five-day protection when an activity is added.
- If extension is allowed later, require an explicit action, reason, permission, and audit trail.

### Report a signed contract

`ReportSignedContract` must be atomic and idempotent:

1. Re-check that the actor may convert the claim.
2. Lock the customer and active claim.
3. Validate contract code, signed date, selected product package/items, commercial value, and evidence required by policy.
4. Create the contract and items.
5. Mark the approach claim `CONVERTED`.
6. Set the protected owner and `protection_until = protection_start + 5 years`.
7. Create expected revenue records without pretending cash has been collected.
8. Record activity/audit data and enqueue any post-commit reconciliation notification.

Recommended protection start: the signed date. Confirm whether the effective date should be used instead before implementation.

Exception for new official school-directory contracts: the subsequently supplied
PDF requires manager review -> CHECKEE verification -> KIDSFIT recording, with five
years from valid verification. Read `school-directory-workflows.md` for that flow.
Do not rewrite historical contracts or assume reporting alone grants protection.

### Expiry and conflicts

- Determine eligibility from server-side timestamps even if an expiry worker is delayed.
- A scheduled/background process may materialize expired statuses for reporting, but correctness must not depend on that process running on time.
- CHECKEE reconciliation must not edit historical claims or contracts destructively. Confirm, dispute, resolve, or reverse through append-oriented records.
- An administrator override requires a reason and audit record and must not silently rewrite the original registration time.

## Accounts, organizations, and data scope

Use permission-based RBAC plus organization/team scope. Role names are suggested bundles, not business checks embedded in code.

| Account type | Default scope and responsibilities |
| --- | --- |
| Quản trị viên | Full configuration, identity, scope, override, and audit access. |
| Ban giám đốc | Read all operational/financial reports; approve defined exceptions. |
| Kế toán | Record/confirm collected revenue, calculate/approve/pay commissions, view required contract data. |
| Quản lý bán hàng | View team pipeline, supervise activity, approve permitted exceptions, no unrestricted financial mutation. |
| Chăm sóc khách hàng | View contracted customers and support context; record support activity; no commission-policy mutation. |
| Nhân viên bán hàng | Register and manage own scoped prospects, report contracts, view own sales and income. |
| CHECKEE | View only reconciliation fields, confirm/dispute rights and contracts for CHECKEE scope; no internal commission visibility by default. |
| Đối tác triển khai | Manage its organization and CTVs; view its pipeline/revenue; version sales policies within delegated limits. |
| CTV của đối tác | Manage only own registrations/activities and view own eligible commission/income. |

Every query and mutation must enforce both permission and row scope. External partner/CHECKEE accounts must not gain access merely by guessing an ID. Mask customer PII and internal financial details that are unnecessary for the role.

Partner policy changes must be versioned, effective-dated, scoped to the partner, and non-retroactive unless an explicitly authorized adjustment is recorded.

## Revenue, commission, and monthly take-home

Keep these quantities distinct:

- Contract value: commercial amount agreed.
- Expected revenue: payment schedule or amount due.
- Collected revenue: completed receipts only.
- Commission accrued: calculated from an immutable policy version and qualifying event.
- Commission approved: eligible for payout after checks.
- Commission paid: included in a completed payout.
- Monthly take-home: paid amount minus explicit withholding/adjustment items for that payout period.

Recommended default: accrue commission from collected revenue, not merely contract value. This remains a product decision if CHECKEE/KIDSFIT uses another trigger.

Never recalculate old commissions under a newly edited policy. Store the policy version and calculation inputs on each ledger entry. Corrections use adjustment/reversal entries; do not overwrite paid history.

## Suggested domain model

Implement this as a `ChannelSales` bounded context alongside the existing education-center CRM modules. Do not reuse education lead statuses for protection claims.

- `organizations`: KIDSFIT, CHECKEE, and partner organizations.
- `organization_memberships`: user, organization, status, manager/team relationships.
- `customers`: canonical customer and lifecycle data.
- `customer_identifiers`: normalized exact-match identifiers and verification state.
- `approach_registrations`: owner, organization, status, registered/protected/expired timestamps, idempotency key.
- `customer_activities`: calls, meetings, notes, evidence, next follow-up.
- `products`, `product_packages`, `package_items`.
- `contracts`, `contract_items`, `contract_evidence`.
- `customer_protections`: owner, source contract/claim, effective range, status.
- `revenue_schedules`, `revenue_receipts`.
- `commission_policy_versions`, `commission_rules`.
- `commission_ledger`, `payouts`, `payout_items`.
- `reconciliation_cases`, `reconciliation_events`.
- Existing shared `users`, permission tables, notifications, and audit logs may be extended deliberately.

Use exact decimal/integer money, MySQL row locking for contested registration/contract/payment actions, binary-collated unique idempotency keys, and deterministic indexes on customer identifiers, active protection lookups, owner/team dashboards, contracts, receipts, and payout periods.

## Suggested API actions

```text
GET  /api/channel-sales/customers/search
POST /api/channel-sales/approach-registrations
GET  /api/channel-sales/approach-registrations
GET  /api/channel-sales/approach-registrations/{id}
POST /api/channel-sales/approach-registrations/{id}/activities
POST /api/channel-sales/approach-registrations/{id}/report-contract
POST /api/channel-sales/reconciliation-cases/{id}/confirm
POST /api/channel-sales/reconciliation-cases/{id}/dispute
POST /api/channel-sales/contracts/{id}/revenue-receipts
GET  /api/channel-sales/commissions/me
POST /api/channel-sales/payouts/{id}/approve
POST /api/channel-sales/payouts/{id}/complete
```

Prefer named action services such as `RegisterCustomerApproach`, `ReportSignedContract`, `ConfirmRevenueReceipt`, `AccrueCommission`, `ApprovePayout`, and `ResolveProtectionDispute`.

## Minimum acceptance criteria

- Two concurrent registrations for the same exact customer identifier yield exactly one active owner.
- Retrying the winning request with the same idempotency key returns the same result.
- A second actor is blocked before the five-day expiry and allowed after expiry when no contract protection applies.
- Client clock changes cannot bypass or prolong protection.
- Only an explicit authorized contract report creates `CONTRACTED` state and five-year ownership.
- External partner, CTV, and CHECKEE accounts cannot read customers, commissions, or contracts outside their row scope.
- Contract reporting cannot create a partial contract/ownership/revenue state.
- Revenue receipts cannot be duplicated or exceed the defined receivable without an authorized adjustment path.
- Commission calculations retain the exact policy version and inputs; paid entries are not destructively edited.
- All overrides, disputes, approvals, receipts, and payouts retain actor/time/reason audit data.
- Database integration/concurrency tests run against MySQL 8.4, not SQLite alone.

## Decisions still requiring product confirmation

Track these explicitly; do not guess during implementation:

1. Exact duplicate key hierarchy for organization versus individual customers.
2. Whether five days means 120 hours or five calendar/business days, and the business timezone.
3. Whether managers may extend or cancel an approach claim, and under which evidence/approval rules.
4. Whether five-year protection starts from contract signed date or effective date.
5. What happens after five years when the contract/customer is still active.
6. Required contract evidence and whether CHECKEE confirmation is mandatory before protection becomes final.
7. Revenue source: manual entry, CHECKEE sync, accounting import, or payment integration.
8. Commission trigger, tax/withholding rules, clawbacks, split commissions, approval levels, and payout schedule.
9. Delegated limits within which a partner may change its sales policy.
10. Data fields CHECKEE may view and the SLA/workflow for disputes.
