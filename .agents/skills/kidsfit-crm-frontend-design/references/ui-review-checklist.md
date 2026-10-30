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

## Screenshot 1 audit baseline (2026-10-30 user-provided image)

Screen: Admin > Quản lý đề xuất trường. Visible: deep-green sidebar, light workspace, green table header, global search, page-level blue "Làm mới", table toolbar with orange "Tìm kiếm" plus icon reset, a proposed school marked "Chờ Admin", row action icons (edit/history/approve), pagination.

Findings to carry into a **future UI change** (not authorized by this skill-only PR):
1. "Làm mới dữ liệu" and "Đặt lại bộ lọc" both use circular-arrow-like icons; distinguish through label/tooltip and function.
2. Screenshot header shows 30/10/2026 while the pending proposal shows due 16:15 29/10/26. If due in the past in actual server time, show a derived **Quá hạn** marker; do not rewrite business state.
3. Align toolbar search field/select/button sizing and row-action hit areas; keep existing names/accessible labels and confirm approvals.
4. Check table at mobile/tablet widths; current desktop table min width is 760px, so contained scrolling is necessary.
5. Avoid inventing interactions from a static screenshot; source currently contains real handlers, permission checks and a demo/preview distinction.

Evidence reference: user-provided chat screenshot; **no screenshot file is committed to repository**. Verify with actual browser before claiming visual parity.
