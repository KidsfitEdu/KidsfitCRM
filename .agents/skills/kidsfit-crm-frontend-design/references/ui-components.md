# Reuse map — KIDSFIT frontend components and interaction patterns

Refer to the actual implementation before modifying signatures or behavior. Paths are relative to repository root.

| UI pattern | Existing component/source | Design / behavior contract |
| --- | --- | --- |
| Title/eyebrow/description/action | \`frontend/src/components/common/app-page-header.tsx\` | Consistent title hierarchy; responsive action wrapping |
| Action buttons (tones, pending) | \`frontend/src/components/common/buttons/app-button.tsx\` | Prefer \`AppButton\` \`green/orange/blue/outline/ghost/danger\`; honor \`busy\` & disabled, avoid multiple indistinguishable primaries |
| Search/filter/reset | \`frontend/src/components/common/admin-list-ui.tsx\` (\`AdminListToolbar\`) | Form submit on Enter, explicit filter reset, separate **data refresh** action |
| Lists + row actions | Same file (\`AdminListPanel\`, \`AdminIconAction\`, \`AdminStatusBadge\`) | Semantic table header, explicit status label, \`aria-label\`, permissions and tooltip |
| Pagination | \`frontend/src/components/common/app-pagination.tsx\` | True total, page/size sync, disabled boundaries; preserve context on filter changes |
| Select | \`frontend/src/components/common/app-native-select.tsx\` | Native label and predictable keyboard behavior |
| Empty state | \`frontend/src/components/common/app-empty-state.tsx\` | Explain why empty and one useful recovery action |
| Notices / toast | \`frontend/src/components/common/app-toast-provider.tsx\` | Success/failure messages grounded in server result, no false success |
| Confirmations | \`frontend/src/components/common/dialogs/confirm-dialog.tsx\` and shadcn Dialog | Name subject/action, show impact, confirm only for high-risk changes |
| Inputs and errors | \`frontend/src/components/ui/input.tsx\`, \`form-error.tsx\` | Controlled state, programmatic labels and \`aria-invalid\` |
| Shell/nav | `frontend/src/components/crm/crm-app.tsx`, `frontend/src/components/layout/{Sidebar,Header}.tsx` | Desktop Sidebar 248px/72px toggles in Header; mobile bottom nav; do not reimplement in each role |
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

## Standard interaction contracts from the approved 2026-11-16 screenshots

### List, toolbar, row actions and pagination

- Keep `AdminListPanel` and `AdminListToolbar` as the first reuse candidates for the photographed Admin staff/organization and school tables: a single white rounded panel with consistent controls, brand-green table head, semantic status badges, circular/rounded icon buttons and footer page-size/page-navigation controls.
- Search button is orange only where current app's toolbar uses the search accent; Reset only clears filter input and selected filter(s); Refresh refetches with the current query. Tooltips and accessible labels must distinguish them.
- Use existing `AdminIconAction` or relevant shared primitive and its semantic variants: green Eye (view), blue Pencil (edit), destructive red Trash2 (delete), amber Archive (archive), cyan Download (download) and violet RotateCcw (restore). Check actual existing variants before extending; never create a separate role-specific icon-button system. Destructive operations demand a clear confirmation of effects; archive is **not** a synonym for delete.
- Map backend statuses to stable *visual families* in the shared badge mapper: success green (active/verified), info blue (in-progress), warning amber (awaiting action), danger red (rejected/error), gray (unstarted), violet (renewal/restoration). Do not assign unique arbitrary colors to every raw code or infer server state from display wording; derived urgency is distinct from status. Status and "Cần xử lý" labels must be separately modeled.
- Reuse `AppPagination` with real total/page size, disabled boundaries and a clear per-page selector where supported.

### Right-side detail drawer / Sheet

- Inspect existing Drawer/Sheet primitives and current consumers; reuse before making anything new. Visual reference: the screenshot of Admin **Thông tin nhân sự** — branded dark-green header with eyebrow/title and close affordance; neutral backdrop dim; summary area (avatar/title/subtitle/status), then separately bordered/rounded groups with small green icons and label-over-value fields; internal scrolling and anchored footer when needed.
- Desktop width is typically about 480–560px **when content allows**, but must fit viewport; mobile approaches full viewport width. Keep padding around groups and prevent horizontal overflow.
- Provide a meaningful title and optional description, focus trap, Escape close, focus restoration, scroll-lock and appropriate dialog semantics. Permissions still determine visible sections/actions. State loading, error, empty and "Chưa cập nhật" distinctly, without inventing values.

### Branded modal form

- Inspect existing shadcn Dialog, shared field controls and existing modal flows; update style through reuse, not a second form stack. Match screenshot **Mời Sales/CTV nhận trường**: branded green title bar with close icon, spacious white content, aligned labels and required markers, gently outlined rounded Select/Input/Textarea, consistent focus ring, two columns on desktop if legible and one on mobile.
- Place the independent Cancel action before the green primary submit on the right side of a visually distinct footer. Preserve non-submitted values on server errors, show inline validation with `aria-invalid`/`aria-describedby`, prevent duplicate submits, confirm high-impact changes, and ensure footer stays usable with mobile keyboard.
- Do not change validation, assignments, authorization or workflows merely to match screenshot field labels.

### Toast notification

- Use `frontend/src/components/common/app-toast-provider.tsx` as the first candidate. Do not add another provider/library unless it demonstrably cannot meet requirements.
- Standard visual structure: floating top-right white surface on desktop, semantic circular icon, readable title and short optional supporting description, close action, soft shadow/border and optional subtle countdown/progress line. On small viewports keep toasts away from bottom nav, modal actions and accessible controls.
- Success = green, error = red, warning = amber, info = blue; loading feedback stays pending until the API has completed. Ordinary success/info can dismiss in about 4–5 seconds; errors requiring attention should stay readable/dismissible. The indicator cannot be the only measure of urgency. De-duplicate repeated identical notifications, avoid a tall stack and never expose sensitive backend details.
- Announce feedback appropriately (e.g. `role="status"` for non-urgent updates, `role="alert"` for urgent errors). Do not show success on request start or optimistic UI alone.

## Dashboard components: reuse contracts and behavior

**Reference implementations on `develop`:**
- `frontend/src/screens/Board/BoardDashboardPage.tsx` — BGĐ overview with real report period, `AppStatCard`, `ChartContainer`, Recharts line/pie, tooltip, legend and permission-aware API.
- `frontend/src/components/roles/SalesDashboard.tsx` — Sales overview with four role-scoped KPI cards and upcoming consultations; **it does not currently include a verified historical trend API**.
- `frontend/src/components/common/app-page-header.tsx`, `app-stat-card.tsx`, `admin-list-ui.tsx`, `app-pagination.tsx`, `frontend/src/components/ui/chart.tsx` — inspect these before creating a new Dashboard primitive.

### Component contract

1. **Header:** `AppPageHeader` owns breadcrumb, title, description and contextual action layout. “Kỳ báo cáo” needs a properly labeled month/date selector linked to actual period-specific data; “Làm mới” re-fetches the same period and has busy/disabled feedback. Do not show an inert filter.
2. **Metrics:** `AppStatCard` displays a stable label, high-priority `vi-VN` formatted value, related icon and brief interpretation/time basis. Use a consistent grid and equal visual rhythm; treat missing/forbidden/unknown as “—” or a clear message, not fabricated zero. Keep action and metric scopes appropriate to the current role.
3. **Chart card:** rounded white shared surface, title + timeframe/units, real data plotted using Recharts inside `ChartContainer`, accessible axes/legend/tooltips, theme-aware chart tokens; hide chart itself for invalid or empty input with useful empty-state explanation. Avoid adding new chart packages, generic wrappers that duplicate `ChartContainer`, or chart aesthetics that distort values.
4. **Operational card:** show deadlines, tasks, school follow-ups or pending actions in a consistent list/table. Reuse `AdminListPanel`, `AdminIconAction` and semantic badges; keep controls wired to existing callbacks/permissions, with clear empty and error paths.
5. **Chart type choice:** line for sequential trend, bars for comparable groups, donut for a small composition; never chart a single total as a multi-month series. Preserve units VND and calendar/date meaning, and verify totals if showing parts of a whole.
6. **Loading and partial errors:** do not replace an API failure with illustrative statistics. Use a clear skeleton/loading message, distinct no-data/permission/preview cases and independent errors for optional insight areas. Announce state to assistive technology appropriately.

**Reusable design boundary:** Dashboard pages can share `AppStatCard`, chart primitives, branded panel styles and status vocabulary without sharing the same data queries or KPI set. A UI-only task must not silently invent back-end endpoints, monthly trend tables, financial authority or metric definitions.

## Error, empty, disabled and preview semantics

- Distinguish: empty dataset, no matching filter results, forbidden scope, server error, and preview-only data. Do not replace an API error with a fake empty or successful result.
- If a user lacks permission, hide/disallow action **and** ensure server authorization is enforced; accessible explanatory read-only state is preferable to unexplained missing actions when suitable.
- Display timestamps and identifiers from backend, not handcrafted reference screenshot values.
- Demo-only actions must never imply a real contract was verified or a real payment made.

## Concrete screen reference: Admin → Quản lý đề xuất trường

Current source \`frontend/src/screens/Admin/Proposals/ProposalsPage.tsx\` uses \`AppPageHeader\`, \`AdminListToolbar\`, \`AppNativeSelect\`, semantic table, \`AdminIconAction\` and \`AppPagination\`. Preserve them. From screenshot: green sidebar, header with global search, title, separate "Làm mới", a toolbar with query/status/search/reset, proposal row and three small actions. Recommendations **for a later UI PR only**: distinguish reset/refresh icons, show overdue for unresolved past-due items, strengthen icon-action tooltip/accessible hit area and mobile overflow. This skill PR makes **no screen changes**.
