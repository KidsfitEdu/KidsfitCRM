# Roles, membership scope and permission matrix

**Business baseline 2026-10-30.** Seven **target business roles**; organization/membership context is separate from role. KIDSFIT owns CRM operation; CHECKEE verifies contracts and accesses authorized reconciliation fields. Directors are BGĐ KIDSFIT.

## Roles and organization scope

| Target role | Responsibility | Scope |
| --- | --- | --- |
| `ADMIN` | Accounts, canonical directory/import, proposal approval, configurable Sales capacity, audit | KIDSFIT administration |
| `DIRECTOR` | Policy and exceptions, performance, disputes, overdue escalation | Authorized KIDSFIT-wide |
| `ACCOUNTANT` | Financial receipts, refund records, commission reconciliation and payouts | Authorized finance scope |
| `SALES_MANAGER` | Direct team, school proposal intake, allocations, extensions, contract review **and direct CHECKEE submission** | KIDSFIT or partner team only |
| `CUSTOMER_SERVICE` | Assigned verified customer, handover, after-sales case history | Assigned caseload |
| `CHECKEE` | Independent verification/reconciliation, request evidence | CHECKEE-scoped cases; no internal salary/commission by default |
| `SALES` | Both employees and collaborators: register/receive school, propose, contact, request extension, contract report, own income | Own assigned leads and permitted directory |

Employee vs collaborator is an optional *membership/personnel attribute for reporting only*, not an eighth authorization role. Both may self-register or be assigned. Both have **default 10 concurrent schools**; Admin may override per member with audit. Both share **provisional 30%** commission concept, but not a live rate until the official policy is approved.

## Target business action permissions

Legend: `R` read in permitted scope; `W` perform action; `A` authorize/decide; `-` no default permission. These are product targets, not a claim that current backend codes implement them.

| Business action | ADMIN | DIRECTOR | ACCOUNTANT | SALES_MANAGER | CUSTOMER_SERVICE | CHECKEE | SALES |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Import/update official school directory | A | R | - | R | - | R (restricted) | R (restricted) |
| Submit new school proposal | - | R | - | R | - | - | W |
| Manager review/forward proposal | - | R | - | A | - | - | R |
| Approve canonical school addition | A | R | - | - | - | - | - |
| Self-register or accept school allocation | - | R | - | W (own eligible claim) | - | - | W |
| Allocate school to Sales | - | R | - | A | - | - | - |
| Change per-Sales capacity | A | R | - | R | - | - | R (own) |
| Record interaction/pipeline | - | R | - | R/W (assigned) | R (after handoff) | - | W (own) |
| Review 7-day extension (max 3) | - | R/exception | - | A | - | - | Request |
| Check and send contract to CHECKEE | - | R (oversight) | R | A/W | - | Receive | Create |
| Verify contract with evidence | - | R | - | R | - | A | R (own) |
| Grant KIDSFIT 5-year protection | **OPEN delegated role** | R | - | **OPEN** | - | - | - |
| Record collected receipts | - | R | A/W | R | - | R if needed | R (own) |
| Adjust/approve/pay commission | - | R | A/W | R (scoped) | - | - | R (own) |
| Assign CSKH/support | - | R | - | W within authority | A/W (assigned) | - | - |
| Handle disputes/management escalations | - | A | - | Raise | - | Collaborate | Raise |

CHECKEE must not see partner-wide income or school contact PII beyond its verification purpose. Neither partner manager nor Sales can access another partner's protected school contacts through direct URL/API IDs.

## Legacy compatibility and transition plan

The repository currently seeds `ADMIN`, `SALES`, `BOARD`, `ACCOUNTANT`, `SALES_MANAGER`, `CUSTOMER_CARE`, `CHANNEL_SALES`, `CHECKEE`, `PARTNER_ADMIN`, `PARTNER_COLLABORATOR`. These are **implementation codes**, not all currently active business roles. Do not claim exactly 7 persisted role rows.

| Legacy implementation identifier | Intended target presentation | Migration note |
| --- | --- | --- |
| `BOARD` | `DIRECTOR` | Map permission bundle/UI; do not drop user-role history |
| `CUSTOMER_CARE` | `CUSTOMER_SERVICE` | Alias/migrate only with compatible permissions |
| `CHANNEL_SALES`, `SALES`, `PARTNER_COLLABORATOR` | `SALES` | Normalize permissions + 10-school capacity; preserve employment/organization association |
| `PARTNER_ADMIN`, `SALES_MANAGER` | `SALES_MANAGER` | Keep delegated partner administration capabilities as scoped permissions rather than global role |
| `CHECKEE`, `ACCOUNTANT`, `ADMIN` | Same business roles | Check real permissions/row scope before unification |

A safe phased rollout needs mapping for existing users, permission parity tests, per-membership capacity migration, frontend consolidation, seeded demo accounts, and reversible additive migrations. Never rewrite financial ledger, audit, approach or contract ownership records during role consolidation.
