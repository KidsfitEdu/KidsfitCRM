# UI review / QA checklist for KidsfitCRM

Use on each changed screen. Mark each item PASS/FAIL/NOT_TESTED with screenshot/video and environment when available. A code review alone does not establish screenshot fidelity.

## A. Reference fidelity and design consistency

- [ ] Screen purpose, role, title/eyebrow and action order match approved requirement.
- [ ] Sidebar, topbar, workspace canvas and navigation match existing KIDSFIT shell.
- [ ] Reused \`AppPageHeader\`, \`AppButton\`, shared form/list components instead of duplicated styles.
- [ ] Existing semantic tokens and typography used; color meanings stable in light/dark.
- [ ] Table and form density appropriate; no clipped Vietnamese accents, titles or key data.
- [ ] Icon-only actions have correct names and recognizable iconography; brand color does not override severity.

## B. Functional states and permissions

- [ ] Local search, filters, reset and server refresh operate independently and keep consistent pagination.
- [ ] Loading, empty, no match, error, no access, preview/demo, success and disabled states distinguishable.
- [ ] Duplicated clicks do not submit duplicate high-impact actions; pending state visible.
- [ ] Approve/reject/cancel actions confirm relevant record and respect row-scope authorization.
- [ ] Outdated \`PENDING_ADMIN\` / \`PENDING_MANAGER\` due timestamps are visibly overdue when authoritative time has passed; no change to underlying status just for visual urgency.
- [ ] Date and money formatting have clear locale/timezone and do not invent real receipt or contract data.
- [ ] Seven-role target vocabulary accurate, legacy runtime role compatibility preserved.
- [ ] No UI for unapproved final KIDSFIT protection-grant actor, 30% payout activation or private referrer splits.

## C. Accessibility

- [ ] Page has appropriate landmark/headings; table has real \`th\` and understandable column labels.
- [ ] Search input/select have explicit labels; errors associated with fields.
- [ ] Keyboard Tab/Shift+Tab/Enter/Escape, focus visibility, modal focus return work.
- [ ] Icon buttons have \`aria-label\`, tooltips not the only way to know their actions.
- [ ] Status is not color-only; sufficient contrast in light/dark; touch targets reasonable.
- [ ] Notifications use accessible announcement semantics, do not falsely claim success.
- [ ] No unintended horizontal page scroll at narrow widths / 200% zoom.

## D. Responsive and test evidence

- [ ] Visual inspection at 375 / 768 / 1024 / 1440px (320px for dense view).
- [ ] Fixed bottom nav never overlays actionable forms/dialog.
- [ ] Table scroll, long names, date/time, badges and inline actions remain usable.
- [ ] Light and dark theme inspected; overflow and hover/focus tested.
- [ ] \`npm run lint\` and \`npx tsc --noEmit\` run; \`npm run build\`; relevant \`npm run test:demo\`.
- [ ] When behavior/permissions changed, related backend/API integration tests are added/run.
- [ ] Report before/after screenshots only if actually captured. Clearly state any checks not run.

## E. New 2026-11-16 screenshot-reference acceptance checklist

Mark each item PASS/FAIL/NOT_TESTED against a **rendered** screen where possible. These are future UI implementation checks; adding them here does not claim that the application was visually redesigned.

### App shell, list and toolbar
- [ ] Active sidebar item, topbar controls, green page eyebrow, page heading, supporting description and contextual main action follow the same KIDSFIT hierarchy as the supplied **Nhân sự & đối tác** and **Quản lý trường học** screenshots.
- [ ] A rounded neutral panel contains balanced search/status/select, orange Search, distinct Reset, green table header, clean rows, useful pagination and page-size selector where supported.
- [ ] Search, filter, reset and refresh retain distinct working behavior; table labels, data and permission scopes remain unchanged except by authorized functional changes.
- [ ] Small-width table scrolling stays inside the panel; action icons/status/pagination remain reachable.

### Action buttons and semantic status
- [ ] View green, Edit blue, Delete red, Archive amber, Download cyan, Restore violet across all relevant consumers; mapping is semantic and centralized, not random per row.
- [ ] Icon buttons have consistent shape/size, hover/focus/disabled states, text alternatives and tooltips; destructive actions show confirmation.
- [ ] Active/verified green, in-progress blue, waiting amber, rejected/error red, unstarted neutral, renewal/restoration violet where applicable; **each meaning remains consistent**, not necessarily each raw status a unique color.
- [ ] Badge text, contrast and optional icon make the meaning usable without color; overdue urgency and required action stay separate from authoritative status.

### Right-side detail and form modal
- [ ] Detail Drawer follows **Thông tin nhân sự** reference: branded header/close, dimmed overlay, profile summary, titled rounded section cards, icon, label-over-value display and sensible missing data.
- [ ] Drawer content scrolls within the panel, footer remains usable, focus and Escape behavior work, and the panel adapts to narrow viewports and 200% zoom.
- [ ] Form modal follows **Mời Sales/CTV nhận trường**: green header/close, white spacious body, labeled required controls, matching radius/focus, desktop grouping and mobile single column.
- [ ] Inline errors are connected to inputs, Cancel/primary green Submit are consistently ordered, pending/disabled and duplicate-submit protections work.

### Toast / feedback
- [ ] Toast follows the supplied success notification reference: top-right floating light card on desktop, semantic icon, title/details, close, optional subtle progress indicator and clear contrast.
- [ ] Success/info/warning/error tones are consistent, feedback is linked to actual API outcome, repeated notifications are deduplicated and urgent errors remain readable.
- [ ] Toast does not hide key actions, drawer footer or bottom navigation on phone, and announces updates to assistive technologies.

### Review integrity
- [ ] Components/tokens are reused rather than introducing overlapping Table, Dialog, Drawer, Button or Toast systems.
- [ ] 375/768/1024/1440px, light/dark, keyboard, touch and 200% zoom are inspected when UI code changes; screenshots are compared only if browser rendering actually occurred.
- [ ] Document which exact routes/roles were visually reviewed and mark unavailable tests as NOT_TESTED, not PASS.

## F. BGĐ-inspired role Dashboard acceptance checklist (2026-11-17)

Use the user-provided **BGĐ Tổng quan điều hành** screenshot as a visual-quality reference for dashboards, including Sales/CTV. These checks apply to a **future frontend implementation**, not a claim that this documentation-only change improved runtime UI. Mark PASS/FAIL/NOT_TESTED; keep a screenshot and route/device record where possible.

### Header, KPI hierarchy and composition
- [ ] Role eyebrow, strong title, concise purpose and permitted controls follow the shared `AppPageHeader` hierarchy.
- [ ] KPI selection is role-relevant and authorization-safe; summary figures have clear scope and reference time/period.
- [ ] KPI cards reuse `AppStatCard`, with balanced heights, soft green icon container, readable label and dominant tabular values; no chopped VND values/diacritics.
- [ ] Grid uses up to four tiles on wide desktop, then reflows meaningfully at 1024/768/375px and 200% zoom.
- [ ] Main analytical/operational card has a useful companion (chart, status composition, or upcoming tasks), not filler content.

### Charts, period and data integrity
- [ ] Trend charts are backed by real, authorized, dated time series rather than a fabricated spread of one aggregate total.
- [ ] Line/bar/donut choice accurately represents trend/comparison/composition and avoids misleading axes, excess decoration and false trend interpolation.
- [ ] Charts have title, units, relevant timeframe, legend and tooltip; pie/donut totals reconcile with displayed parts, and zero/empty data has an explicit message.
- [ ] Use `ChartContainer`, `ChartTooltip`, Recharts and shared CSS variables with light/dark colors; do not add duplicate chart infrastructure.
- [ ] Period control is labeled and actually changes period-specific queries; refresh re-fetches without clearing the chosen period; current-state snapshots are not incorrectly presented as historical period data.
- [ ] No organizational revenue/commission/other restricted metrics leak into Sales/CTV views; preview/demo values are explicitly identified.

### Operational states and QA evidence
- [ ] Upcoming consultation/priority tasks are actionable only with actual callback and backend-authorized scope, and use consistent semantic statuses.
- [ ] Loading, empty, no chart data, partial failure, total API failure, forbidden state and refreshing are visually distinct; missing/forbidden data is not displayed as zero.
- [ ] Keyboard focus, screen-reader text alternative to visual trend, touch behavior and reduced-motion preferences are considered.
- [ ] Actual visual check records 375/768/1024/1440px, light/dark and 200% zoom; otherwise mark visual QA NOT_TESTED.
- [ ] `npm run lint`, `npx tsc --noEmit`, relevant tests and build are reported from the exact UI commit when runtime code is modified. Documentation-only edits do not claim these checks ran.

## Screenshot 1 audit baseline (2026-10-30 user-provided image)

Screen: Admin > Quản lý đề xuất trường. Visible: deep-green sidebar, light workspace, green table header, global search, page-level blue "Làm mới", table toolbar with orange "Tìm kiếm" plus icon reset, a proposed school marked "Chờ Admin", row action icons (edit/history/approve), pagination.

Findings to carry into a **future UI change** (not authorized by this skill-only PR):
1. "Làm mới dữ liệu" and "Đặt lại bộ lọc" both use circular-arrow-like icons; distinguish through label/tooltip and function.
2. Screenshot header shows 30/10/2026 while the pending proposal shows due 16:15 29/10/26. If due in the past in actual server time, show a derived **Quá hạn** marker; do not rewrite business state.
3. Align toolbar search field/select/button sizing and row-action hit areas; keep existing names/accessible labels and confirm approvals.
4. Check table at mobile/tablet widths; current desktop table min width is 760px, so contained scrolling is necessary.
5. Avoid inventing interactions from a static screenshot; source currently contains real handlers, permission checks and a demo/preview distinction.

Evidence reference: user-provided chat screenshot; **no screenshot file is committed to repository**. Verify with actual browser before claiming visual parity.
