# Reuse map — KIDSFIT frontend components and interaction patterns

Refer to the actual implementation before modifying signatures or behavior. Paths are relative to repository root.

| UI pattern | Existing component/source | Design / behavior contract |
| --- | --- | --- |
| Title/eyebrow/description/action | \`frontend/src/components/common/app-page-header.tsx\` | Consistent title hierarchy; responsive action wrapping |
| Action buttons (tones, pending) | \`frontend/src/components/common/app-button.tsx\` | Prefer \`AppButton\` \`green/orange/blue/outline/ghost/danger\`; honor \`busy\` & disabled, avoid multiple indistinguishable primaries |
| Search/filter/reset | \`frontend/src/components/common/admin-list-ui.tsx\` (\`AdminListToolbar\`) | Form submit on Enter, explicit filter reset, separate **data refresh** action |
| Lists + row actions | Same file (\`AdminListPanel\`, \`AdminIconAction\`, \`AdminStatusBadge\`) | Semantic table header, explicit status label, \`aria-label\`, permissions and tooltip |
| Pagination | \`frontend/src/components/common/app-pagination.tsx\` | True total, page/size sync, disabled boundaries; preserve context on filter changes |
| Select | \`frontend/src/components/common/app-native-select.tsx\` | Native label and predictable keyboard behavior |
| Empty state | \`frontend/src/components/common/app-empty-state.tsx\` | Explain why empty and one useful recovery action |
| Notices / toast | \`frontend/src/components/common/app-toast-provider.tsx\` | Success/failure messages grounded in server result, no false success |
| Confirmations | \`frontend/src/components/common/confirm-dialog.tsx\` and shadcn Dialog | Name subject/action, show impact, confirm only for high-risk changes |
| Inputs and errors | \`frontend/src/components/ui/input.tsx\`, \`form-error.tsx\` | Controlled state, programmatic labels and \`aria-invalid\` |
| Shell/nav | \`frontend/src/components/crm/crm-app.tsx\` | Current nav, sidebar, topbar, mobile bottom nav; do not reimplement in each role |
| Table CSS | \`frontend/src/app/globals.css\` \`.crm-workspace-content table:not(.crm-school-table)\` | Be aware global selector affects most CRM tables; special school table is excluded |

## Search / filter / refresh / reset

- **Search** applies current query (form submit/Enter).
- **Filter** changes a selected status; return pagination to page one, preserve other applied filters unless reset intentionally.
- **Reset** clears query and filters, then shows default list; label "Đặt lại bộ lọc".
- **Refresh** refetches with current query, status and page without silently clearing them; label "Làm mới dữ liệu".
- When a request is pending, disable duplicate submits, retain user context, show spinner/loading. On error, show retry; do not render stale demo data as if real.
- For one row there may be edit/history/approve actions. Group by task importance, use clear Vietnamese \`aria-label\` plus tooltip/title, and keep authorization checks. Approval should display the record name and server validation, not assume a click succeeded.

## Table and filter patterns

- Desktop: single \`AdminListPanel\` with toolbar, table and \`AppPagination\`; table header uses existing green token; meaningful empty and skeleton/loading states.
- Mobile: horizontally scroll **inside** table wrapper (\`overflow-x-auto\`), or use an intentional card layout when the task calls for it. Never hide required financial/status information because the width is small.
- Dates: human-readable local date/time, consistent timezone, optional relative urgency. If a pending row has a due date in the past, add **derived** \`Quá hạn\` indicator; if resolved, do not show overdue.
- Money: right aligned and tabular; never display provisional 30% as officially approved unless current policy records support it.
- Avoid entire-row click handlers that conflict with inline action buttons. Preserve keyboard navigation.

## Forms and dialogs

1. Show clear field labels; distinguish required vs optional values.
2. Validate locally for usability, **but server remains authoritative** for permissions and business validation.
3. Keep dirty data if server fails; show field and form errors with appropriate \`aria-describedby\`.
4. High-impact mutations: confirmation dialog with concise consequence, pending state, success toast only after confirmed response; no double submit.
5. Make dialogs scroll within viewport, usable on mobile and with keyboard. Restore focus to originating action where possible.

## Error, empty, disabled and preview semantics

- Distinguish: empty dataset, no matching filter results, forbidden scope, server error, and preview-only data. Do not replace an API error with a fake empty or successful result.
- If a user lacks permission, hide/disallow action **and** ensure server authorization is enforced; accessible explanatory read-only state is preferable to unexplained missing actions when suitable.
- Display timestamps and identifiers from backend, not handcrafted reference screenshot values.
- Demo-only actions must never imply a real contract was verified or a real payment made.

## Concrete screen reference: Admin → Quản lý đề xuất trường

Current source \`frontend/src/screens/Admin/Proposals/ProposalsPage.tsx\` uses \`AppPageHeader\`, \`AdminListToolbar\`, \`AppNativeSelect\`, semantic table, \`AdminIconAction\` and \`AppPagination\`. Preserve them. From screenshot: green sidebar, header with global search, title, separate "Làm mới", a toolbar with query/status/search/reset, proposal row and three small actions. Recommendations **for a later UI PR only**: distinguish reset/refresh icons, show overdue for unresolved past-due items, strengthen icon-action tooltip/accessible hit area and mobile overflow. This skill PR makes **no screen changes**.
