# KIDSFIT CRM — Workflow notification matrix (draft PR #176)

## Scope and provenance

Implementation baseline: `develop` HEAD `0daf52f`, branch `feat/notifications/workflow-inbox`, 2026-11-23. This document reflects source integrations in this branch, **not** a deployed instance or an all-role UAT certification.

Legacy tables are removed by the approved consolidation migration; notice rows in them are not preserved.

### One-table notification persistence

- **Only `crm_notifications`** stores notifications going forward. The newer
  `20261123123000_UnifiedCrmNotifications` migration adds optional due/milestone
  metadata and **drops** `school_proposal_alerts` and `contract_expiry_alerts`.
  The old migration files remain immutable to support a fresh database migration
  from the beginning. As explicitly approved for this development system, old
  alerts are **discarded**, not backfilled. No production database has been touched.
- School-proposal and NT-01/GI-01 workers keep their original schedules, milestone
  and role rules but now write into the shared table with recipient/org scope and
  binary deduplication keys. Notifications keep `due_at`, `due_on`,
  `milestone_on`, read state and resolution state where relevant.
- New workflow events are appended within the initiating business transaction.
  Scheduled worker inserts use `INSERT IGNORE` against a unique key for
  concurrent API instances.
- Canonical API: `GET /api/notifications?page=1&unreadOnly=false` (50/page)
  and `POST /api/notifications/{id}/read`. This marks only the notification,
  not its linked business entity.
- The shared Header bell reads just one feed and supports All / Unread / Action
  filters; old separate endpoints have been removed from current source.
- Notification access requires recipient identity with active membership.
  Further role/record-scoped revocation tests must be run on staging.

## Implemented event matrix

| Event | Recipient | Business source | Target UI |
| --- | --- | --- | --- |
| `SCHOOL_EXTENSION_REQUESTED` | Direct manager | `RequestSchoolExtension` | Manager extensions |
| `SCHOOL_EXTENSION_APPROVED/REJECTED` | Requesting Sales/CTV | `ReviewSchoolExtension` | Sales/CTV approach or extensions |
| `SCHOOL_PROPOSAL_SUBMITTED` | Direct manager | New or submitted proposal | Manager proposals |
| `SCHOOL_PROPOSAL_FORWARDED` | Active central KIDSFIT Admins with school-directory permission | Manager proposal review | Admin proposals |
| `SCHOOL_PROPOSAL_APPROVED/REJECTED` | Requesting Sales/CTV + manager after Admin result | Final or manager rejection | Proposal list |
| `SCHOOL_PROPOSAL_NEEDS_REVISION` | Requesting Sales/CTV | Manager returns proposal for changes | Sales proposals |
| `SCHOOL_INVITATION_NEW` | Assigned Sales/CTV | Manager invites school | Allocations/invitations |
| `SCHOOL_INVITATION_ACCEPTED/DECLINED` | Allocating manager | Assigned Sales response | Manager allocations |
| `SCHOOL_INVITATION_CANCELLED` | Assigned Sales/CTV | Manager cancels invite | Sales allocations |
| `RENEWAL_SUBMITTED/RESUBMITTED` | Active KIDSFIT accounting reviewers | Sales submits or resubmits annual contract | Accounting renewals |
| `RENEWAL_NEEDS_INFO/REJECTED/CONFIRMED` | Original Sales sender | Accounting renewal decision | Sales contract |
| `CONTRACT_CANCELLED` | Owner Sales, manager and CSKH where active | Authorized cancellation | Contract detail |
| `REVENUE_REFUNDED` | Other authorized accounting users | Refund entry | Accounting |
| `COMMISSION_ADJUSTED` | Beneficiary | Accountant ledger correction | Income |
| `SCHOOL_CONTRACT_NEEDS_REVISION/RESUBMITTED` | Sales sender or manager | Contract revision | Contract detail |
| `SCHOOL_APPROACH_EXPIRED` | Owner Sales | Existing expiry transition | Sales customers |
| `SCHOOL_CONTRACT_REPORTED` | Direct manager (when active mapping exists) | Sales reports signed school contract | Manager contracts |
| `CONTRACT_FORWARDED_TO_CHECKEE` | Active CHECKEE verifiers with permission | Manager verifies and forwards contract | CHECKEE verification |
| `CHECKEE_CONTRACT_VERIFIED/DISPUTED` | Sales + direct manager | CHECKEE reconciliation | Sales contract / Manager contracts |
| `PAYOUT_SUBMITTED` | Active central KIDSFIT payout approvers, excluding actor | Accounting submits payout | Board payouts |
| `PAYOUT_CHANGES_REQUESTED/APPROVED` | Payout creator | Director returns/approves | Accounting contracts |
| `PAYOUT_PAID` | Actual beneficiary, when identified | Accounting marks paid | Sales/Manager income |
| `CARE_CONTRACT_ASSIGNED` | Assigned CSKH | Admin care handover | Care customers |
| `SUPPORT_CASE_FORWARDED` | Active CHECKEE technical support | CSKH forwards software support case | CHECKEE support |
| `SUPPORT_CHECKEE_COMPLETED` | Assigned CSKH | CHECKEE completes technical work | Care support |
| `SUPPORT_CASE_RESOLVED` | Original CSKH case creator if distinct | CSKH resolves case | Care support |

### Lifecycle

Actionable request notifications are closed on completion/rejection/approval while staying in history. Distinct result notices go to the initiator. Overdue notifications belong to their existing dedicated workers; no new SLA policy is assumed.

## Verification gates (not proof of production readiness)

1. On an **isolated MySQL 8.4** database, apply the additive migration twice and run backend integration including notification recipient, idempotency, read-only state and existing financial/contract tests; examine failures by exact PR HEAD.
2. CI lint, TypeScript, Frontend build/page/unit tests and Windows route smoke.
3. Verify rights/tenant isolation with several organizations: Sales/CTV, direct manager, Admin KIDSFIT, BGĐ, accountant, CHECKEE, CSKH. Newly revoked users must not access old notices, and cross-org user IDs must not be accepted.
4. Visual UAT 320/375/390/768/1440px, keyboard-focus, 200% zoom, light/dark, long Vietnamese text; verify useful navigation for all notice categories.
5. Manual browser review of pagination, old notices, permission revocation, stale/unavailable target records, and closed work items.

## Remaining work / limitations

- Generic entity-aware navigation currently only opens matching **loaded** Manager proposals/extensions/invitations. Other notification categories route to worklist, and manager records outside the current server page are not auto-fetched.
- Full historical UI pagination (the API exposes 50/page but the bell fetches first page only), dedicated notification history, configurable preferences, batched mark-all-read and push/email/SMS are not implemented.
- Cannot assert production data compatibility, deployed DB migration status, seven-role browser UAT, or missing business approvals without staging evidence.
- Do not infer any post-CHECKEE grant actor (D-12) or automatic pending-extension rights (D-13) from a notification.
