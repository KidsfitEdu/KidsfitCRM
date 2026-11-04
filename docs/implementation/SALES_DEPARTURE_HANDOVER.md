# Sales departure handover and release queue — 2026-11-03

## Confirmed scope

- Preserve **seven** Sales Manager menu entries. Do not merge Team, Progress, Allocation.
- Direct Sales Manager (KIDSFIT or partner) may hand over **own direct Sales/CTV**. Admin retains full-scope oversight and account suspension.
- On departure, revoke active **uncontracted** approaches and their APPROACH protections, cancel pending invitations/extensions, record actor/time/reason/summary and suspend the specific membership.
- Existing contract reports (including CHECKEE review/revision), legitimate long-term protections, historical activities, commission ledger and payouts remain untouched. An inactive Sales member remains the owner/beneficiary of their prior contracts and accruals.
- After release, the school is **available to a new, valid registration or manager invitation**. Never overwrite owner_user_id on historical approach, protection, contract or ledger.
- Separate Admin-owned CSKH allocation remains unchanged.

## Implementation

- Existing `CompleteSchoolHandover`, `ChangeMembershipStatus`, `ReactivateSchoolMembership` now enforce direct-manager membership scope; Admin may still manage permitted full-scope operations.
- `GET /api/channel-sales/manager/team/{membershipId}/handover-preview` shows active claims, contract linkage, next follow-up, contract status, pending invitation/extension counts and handover history before destructive action.
- `GET /api/channel-sales/manager/released-schools` returns paged, direct-team-scoped schools with revoked approach in the past 30 days **and no other active protection**. This is an operations queue, not a new ownership state.
- `POST /api/channel-sales/school-handovers/{membershipId}` reuses the existing audited transactional command, with optimistic idempotency and customer/claim lock protections.
- Sales Manager Team page invokes preview, requires a reason, offers a final confirmation and links to Allocation after successful handover.
- Allocation page highlights recently released schools and preselects one in the existing invitation workflow. Backend rechecks capacity, active membership, duplicate/protection, and direct-team scope.
- Historical contracts/commissions remain readable to their direct manager after the member is suspended; unrelated teams are scoped out.

## Financial policy guardrail

Commission ledger entries record `beneficiary_user_id`, `policy_version_id`, `rate_percent` and `amount`; offboarding **does not edit these**. On later receipts, the current code still looks up the policy in force on that receipt date. The business request to **freeze a percentage for all future installments** requires an explicitly approved time of entitlement establishment and calculation base; `docs/requirements/BUSINESS_RULES.md` BR-15 and `DECISION_LOG.md` D-11 remain PROVISIONAL/OPEN. Do not silently substitute an unapproved rate or alter payout policy. Document the remaining policy decision before implementing a new per-contract snapshot/migration. An already earned ledger entry is immutable except for authorized append-only adjustments.

## Validation and safe release

- MySQL 8.4 isolated `dotnet test backend/KidsfitCRM.slnx`, including direct-manager refusal, preview, release/reassignment, signed contract beneficiary preservation and retry tests.
- Frontend `npm run lint`, `npx tsc --noEmit`, `npm run test:demo`, `npm run build`, Chromium and Windows route smoke.
- No production migration, seed, data deletion, bulk reassignment or automatic merge.
- Before release, UAT on a separate staging DB with real organizational scopes and historical agreements. Financial policy confirmation is separately required for future-rate freezing.
