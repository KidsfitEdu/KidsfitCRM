# KIDSFIT CRM — Workflow notification matrix (draft PR #176)

## Scope and provenance

Implementation baseline: `develop` HEAD `0daf52f`, branch `feat/notifications/workflow-inbox`, 2026-11-23. This document reflects source integrations in this branch, **not** a deployed instance or an all-role UAT certification.

The existing `school_proposal_alerts` (overdue Admin/BGĐ, D-15) and `contract_expiry_alerts` (NT-01) remain intact. New `crm_notifications` is additive; it does not change approval, protection, invoicing, revenue, payout or any preexisting business decision. In particular D-12 and D-13 are still OPEN.

### Persistence and read permissions

- `CrmNotificationWriter.Add` appends workflow notices inside the **same EF business transaction** before SaveChanges/Commit. It does not send email/SMS and does not auto-change business status.
- One recipient + event kind + entity + occurrence forms a unique binary collation deduplication key. A retry of the same idempotent business request must not duplicate notices. Versioned draft events and repeated payout submission use distinct occurrences.
- Recipient can fetch and mark only **their own** notice with an active user and active membership in the notice's active organization. A closed task stays in read-only history (`RESOLVED`) and does not contribute to unread count.
- API: `GET /api/notifications/workflow?page=1&unreadOnly=false` (up to 50/page), `POST /api/notifications/workflow/{id}/read`. This marks the **notification** read, not the linked business record.
- Bell combines new workflow notices with existing overdue-proposal and NT-01 notifications, newest first; filters `Tất cả`, `Chưa đọc`, `Cần xử lý`. Both legacy APIs and read endpoints remain supported.
- Notification click can navigate only to an authorized `View`. Manager proposals/extensions/invitations in the currently loaded server page open their exact record. Other destinations navigate to the respective screen; full record-level deep linking across paginated lists remains a follow-up.

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
