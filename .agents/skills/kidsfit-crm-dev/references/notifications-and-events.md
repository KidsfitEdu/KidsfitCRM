# CRM notifications and events — implementation reference

> Source-of-truth: inspect `backend/src/KidsfitCRM.Api/Features/WorkflowNotificationEndpoints.cs`, `Infrastructure/CrmNotificationWriter.cs`, `Infrastructure/{SchoolProposalAlertService,ContractExpiryAlertService}.cs`, `Features/SchoolAllocationActions.cs`, `Features/ChannelSalesFinanceActions.cs`, `frontend/src/components/layout/Header.tsx` and the current MySQL migrations. Paths describe the 2026-11-23 `develop` snapshot; re-check before editing. A documentation example does not prove a workflow is deployed.

## Ownership: when to load

Load for every feature that creates, reads, marks, routes, expires or displays persistent CRM notices. Use the primary [engineering skill](../SKILL.md) and approved decision log for state transitions. For an inbox/popover redesign, add [Frontend Design](../../kidsfit-crm-frontend-design/SKILL.md) and [Webapp UX](../../kidsfit-crm-webapp-ux/SKILL.md) as relevant. The notification reference is **not** an independent permission policy.

## Canonical model and route checks

- The unified `crm_notifications` entity is a **recipient-scoped event view**, not the authoritative contract/school/payout record. Inspect the current migration history; obsolete school-proposal/contract-expiry *storage* migrations may remain in historical EF files. Never rewrite applied migrations just to align tables.
- Fields to verify: `organization_id`, `recipient_user_id`, `kind`, `entity_type`, `entity_id`, `deduplication_key`, `status`, `read_at`, `resolved_at`, timestamps and optional due/milestone values. Preserve the difference between **read** and **resolved**; closing a task does not imply the user read it.
- Current API contract to check: `GET /api/notifications?page=N&unreadOnly=true|false`, `POST /api/notifications/{id}/read`. Page size and output snake_case are server-owned. Never infer cross-role access from UI.
- Client currently uses TanStack Query pagination in `Header.tsx`; test page append, refetch invalidation, no duplicate entries, unread totals, error/empty/loading, and action filtering. Filters over *loaded* pages must not be advertised as a global server filter.
- Navigation target `target_view` is a **screen hint**, not permission proof. Resolve target entity on the destination screen through an authorized server endpoint. Missing, stale, paginated-away, or revoked records must show a safe fallback.

## Event creation checklist

1. Identify the exact committed business transition and authoritative actor; distinguish state changes, scheduled milestones and UI-only actions.
2. Determine recipient(s) from **active user and organization membership** plus explicit record ownership/manager/permission scope. For a cross-organization manager or CHECKEE/Accounting recipient, verify the recipient actually belongs to the organization whose notice row will be visible. Never broadcast raw partner records to all global users.
3. Choose stable event `kind`, entity type/id and a deduplication key identifying **one real transition** per recipient. Replayed HTTP requests should not duplicate; a legitimate later resubmission/re-review must be distinguishable by business version or occurrence. Concurrent writers require database uniqueness, not only in-memory filtering.
4. Write a notice **in the same database transaction** as the local business mutation where possible. For scheduled workers, use bounded batches and idempotent inserts; do not issue remote emails/Zalo/SMS synchronously inside a DB transaction.
5. Set appropriate `OPEN`/`RESOLVED` lifecycle. Resolving a handled task retains history; read state changes only the notice. Do not silently reopen a business workflow.
6. Avoid placing private phone numbers, full contract identifiers, school contacts or financial evidence in a broadcast title/message. Keep Vietnamese copy short, meaningful, role-safe and compatible with narrow screens.
7. Verify old worker schedules: proposal overdue (D-15), contract/service expiry (NT-01) and GI-01 interruptions. **D-13 pending extension SLA is OPEN** except where an actual approved `ReviewDueAt` is already in source. No invented reminder deadlines, post-CHECKEE grant actors (D-12), or 5-year protection rules.

## Tests and failure cases

- MySQL 8.4 isolated integration: one event/replay, concurrent duplicate, valid second occurrence, cross-org/missing membership, revocation, read/resolve semantics, worker twice, stale/missing target and original business rollback.
- Frontend: keyboard/focus and screen readers, dark mode, 320/375/390px, 200% zoom, long Vietnamese strings, scrolling with sticky header/footer, page loading and `Tải thêm`, wrong/forbidden entity navigation.
- Trace **action → audit → notice → API permission → UI navigation → tests**. State missing coverage honestly; a green build is not seven-role end-to-end UAT.
- For currently reviewed notice events and known gaps also see [notification matrix](../../../../docs/implementation/CRM_NOTIFICATION_MATRIX.md). This document may be older than `develop` and must not override live code.

## Anti-patterns

Do not create a separate table for each new alert category without a reviewed reason; count UI role names as authorization; make a button with no server action; treat an unread notice as a pending business state; mark all pages complete after loading page 1; or delete historical financial/audit data when consolidating notifications.
