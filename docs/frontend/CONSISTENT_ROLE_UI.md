# Consistent role UI — audit and implementation

## Baseline
- Compared role pages with Admin's header, list panel, toolbar, status and table conventions.
- Preserved existing Backend routes, permissions, workflow actions, mutation payloads, and history events.
- Reviewed 98 application TSX files and existing shared components.

## Implemented
- Sales dashboard: four meaningful KPI metrics retained; remove shortcut card duplicating sidebar; upcoming appointments presented as a full-width table with action and empty state.
- Sales worklists: remove the repeated three-KPI row on "Trường của tôi"; retain task tabs, filter controls and existing actions. Avoid extra nested card surface.
- Admin and generic role dashboards: flatten the "Công việc cần xử lý" explanatory card into a bordered section; retain KPI metric cards.
- CHECKEE reconciliation: replace one-card-per-record layout with Admin-style table. Retain contract details, protection dates and event history in each expandable row; preserve dispute/confirm actions behind existing can_reconcile check.
- CHECKEE role menu: display distinct status-based subsets for verification (PENDING/REVIEW_REQUIRED), disputes (DISPUTED), and history (records with events), while reconciliation shows all permitted records. This is display-only filtering of the API's current result set; it is not a substitute for server-side filtering or full pagination.
- Other role pages: add a clear page title and task-specific description, without changing routed panel business behavior.

## Open UX / function issues requiring separate scope
- CustomerCare's handover/cases/followup all currently point to operations/care and can still show similar content; proper separation requires verified care-specific backend fields and workflow contracts.
- Accounting's revenue/payments/reports reuse the finance panel and require domain-specific data definitions before splitting.
- Board overdue and manager team/progress share underlying operations tabs; true task-specific data slicing should not be inferred.
- CHECKEE view filters work on the current response page only; API-side filters and pagination are needed for global counts.
- Browser verification is needed for table overflow, dialogs/drawers and role navigation across desktop/mobile.

## Acceptance
- [ ] CI lint
- [ ] CI TypeScript
- [ ] CI unit tests
- [ ] CI build
- [ ] Browser smoke tests and visual checks
- [ ] Product confirmation for backend-dependent page distinctions

No role rules or backend API semantics were changed in this UI-only batch.
