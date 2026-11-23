# KIDSFIT CRM — Frontend Design System

**Baseline:** 2026-10-30; **visual-reference supplement:** 2026-11-16. **Purpose:** one consistent presentation language for the seven-role school-sales CRM, while respecting existing frontend code, legacy role compatibility and business rules. **Reference screenshots:** Admin → Quản lý đề xuất trường (30/10/2026), plus Nhân sự & đối tác list, Quản lý trường học list/toast, Thông tin nhân sự detail drawer, and Mời Sales/CTV nhận trường form modal (16/11/2026). The screenshots were supplied in chat, **not committed**; inspect live source and render UI to verify implementation.

## Source architecture as of 2026-10-30

The Vinext/React frontend now uses `frontend/src/app/` for routes, `frontend/src/screens/` for role pages, `frontend/src/components/` for shared UI, `frontend/src/config/` for navigation, and `frontend/src/services/` for API clients. Current role page registries are `frontend/src/config/navigation.ts` and `frontend/src/config/role-pages.ts`. Seven **business** roles still coexist with legacy distinct `SalesStaff` and `Collaborator` presentation workspaces until the explicitly reviewed code migration is implemented. Read [current source map](../implementation/CURRENT_SOURCE_MAP.md) and [architecture](../../frontend/docs/architecture.md) before implementing UI.

## Reference implementation

- App shell and role navigation: \`frontend/src/components/crm/crm-app.tsx\`.
- Active brand tokens and dark theme: \`frontend/src/app/globals.css\` (later KIDSFIT \`:root\` definitions override earlier theme defaults).
- Shared components: `frontend/src/components/common/app-page-header.tsx`, `frontend/src/components/common/buttons/app-button.tsx`, `frontend/src/components/common/app-native-select.tsx`, `frontend/src/components/common/app-pagination.tsx`, `frontend/src/components/common/app-empty-state.tsx`; Admin list components at `frontend/src/components/common/admin-list-ui.tsx`.
- Admin proposal screen: \`frontend/src/screens/Admin/Proposals/ProposalsPage.tsx\`; preserve current API handlers and permission controls.
- Stack: React 19, TypeScript, Vinext, Tailwind CSS 4, shadcn/ui, Lucide Icons, TanStack Query. Do not introduce a different UI framework from a design-only request.

## Design language

Deep-green fixed sidebar \`#0e2a1a\` (desktop Sidebar 248px expanded / 72px collapsed), bright near-white workspace \`#f9fafb\`, green table head/primary \`#1b5e20\`, white card \`#fff\`, softened green navigation selection and subdued borders/shadows. Blue \`#0369a1\` is informational/secondary; orange \`#d97706\` is attention/search accent; destructive actions use \`#be123c\`. **Prefer semantic CSS tokens and shared button components, not freshly hardcoded hex values.** Use Vietnamese-friendly Inter/Be Vietnam Pro fallback and clear heading/body hierarchy.

- Header: small green uppercase eyebrow, meaningful page title, muted description, page-level action on the right; wraps on narrow screens.
- Workspace: constrained width, \`space-y-5\`, cards with \`rounded-2xl\`, subtle borders/shadows.
- Inputs and selects: clear accessible labels, consistent heights and radius; focus visible.
- Tables: full context on desktop, horizontal scrolling **inside** panel on small screens, semantic headers; appropriate status chips and aligned date/amount.
- Actions: primary green for commit/approve, orange search/attention where existing pattern uses it, blue information/refresh, outline reset. Do not rely on color to explain role. Icon actions require text labels accessible to assistive technology.
- States: loading, no data, no match, forbidden, error, success, disabled and preview/demo have distinct presentation.
- Dark mode: use \`.dark\` token variants; verify contrast and focus, not just background colors.
- Responsive: existing shell uses a toggleable Sidebar **248px/72px at `lg`** (toggle in Header) and bottom navigation below `lg`; review at 320 / 375 / 390 / 768 / 1024 / 1440px and 200% zoom. See [Web App UX skill](../../.agents/skills/kidsfit-crm-webapp-ux/SKILL.md) for touch, safe areas and virtual keyboard.

## Approved visual contract for future CRM screens (2026-11-16)

This supplement documents the four new user-provided visual references; it does **not** mean these screens have been modified in this documentation-only change. Follow established KIDSFIT components and CSS semantic tokens; design quality means legibility, visual coherence, interaction clarity and accessibility, not decorative additions.

| UI surface | Reference appearance | Mandatory behavior / reuse |
|---|---|---|
| App shell / page | Deep-green sidebar with soft highlighted selection; white topbar for search, theme, notifications, avatar; light workspace; green breadcrumb eyebrow, bold heading, description and contextual action | Keep current AppShell/nav and `AppPageHeader`; no new shell |
| List panel / table | Large rounded white card, soft shadow/border, consistent filter toolbar; strong green table head, balanced neutral rows and contained pagination | Reuse `AdminListPanel`, `AdminListToolbar`, `AppPagination`; separate Search, Reset and Refresh; preserve backend filters |
| Row action icons | Uniform subtly outlined circular/rounded buttons, color by action meaning | View green, Edit blue, Delete red, Archive amber, Download cyan, Restore violet; tooltip, `aria-label`, keyboard focus; confirmation for deletion |
| Status badges | Small softly tinted rounded chips with legible labels, optional semantic icons | Valid/verified green; in-progress blue; waiting amber; error/rejected red; not-started neutral gray; renewal/restoration violet. Reuse badge mapper; state vs urgency vs required action remain separate |
| Detail Drawer | Right-side panel; green header/close, dimmed backdrop; summary card and rounded grouped sections with small green icons, label-over-value fields; footer | Prefer shared Drawer/Sheet; ~480–560px desktop when sensible, narrow/full-width mobile, scroll content internally; Escape/focus return, loading/error/permission states |
| Modal Form | Green branded title/close, white spacious form, paired select fields, clear labels and required indicators, roomy textarea, neutral Cancel and green Submit in footer | Reuse Dialog/input/select/textarea/form validation, 2 columns where readable and 1 column on mobile; field-level error and pending/disabled protections |
| Toast notification | Top-right floating white card with icon, title, brief support text, dismiss control and optional thin duration indicator | Reuse `app-toast-provider.tsx`; green success/red error/amber warning/blue info; deduplicate; standard feedback ~4–5s where appropriate; no false success |

**Color intent:** each **different action category** has its semantic color; each **meaningfully different state family** has a stable badge color. Avoid assigning random hues to each raw backend status or per-row action. Use accessible text/contrast and light/dark tokens—not hardcoded color literals in individual page code. A derived **Quá hạn** warning is not a mutation of a pending backend status.

**Design scope and reuse:** This is a cross-screen visual guideline, not permission to change unrequested pages, statuses, permissions, forms, API responses or business rules. Before any UI implementation, inspect the actual shared components, current page and frontend skill references; if a required reusable primitive is absent, document that gap before adding the smallest justified shared abstraction.

**Visual QA:** Compare rendered screens to the referenced screenshots at 375, 768, 1024 and 1440px, light/dark themes, 200% zoom, keyboard/focus and mobile overlays. Report exactly what was *actually* tested; no screenshot-fidelity claim based on documentation alone.

## Dashboard / Tổng quan visual standards (approved 2026-11-17)

**Visual reference:** BGĐ “Tổng quan điều hành” screenshot supplied by the user in conversation (not committed to the repository). It establishes a professional **layout language** for role Dashboards, not a common set of financial metrics. The current `frontend/src/screens/Board/BoardDashboardPage.tsx` demonstrates `AppPageHeader`, four `AppStatCard` tiles and real-query Recharts charts; `frontend/src/components/roles/SalesDashboard.tsx` has four Sales-focused cards and a consultation table. **This documentation-only update does not modify those runtime screens.**

### Mandatory visual contract

| Region | Design standard | Behavior and data integrity |
|---|---|---|
| Page header | Green uppercase role eyebrow, strong title, one-line description, right-side period/refresh if useful | Period selector must query relevant real period; refresh does not reset filters; no inert controls |
| KPI strip | Up to four balanced soft-shadow white cards; muted label, green-tinted Lucide icon, dominant localized number/VND value, short context line | `AppStatCard` and shared CSS tokens, correct permission, actual time basis; unknown/forbidden is not zero |
| Main analysis | Spacious rounded card, short title, units/period, real-data line/bar trend with legend and tooltip when suitable | Recharts `ChartContainer`/`ChartTooltip`, real dated observations, honest axes and no invented samples |
| Supporting analysis | Compact status breakdown with clear totals/legend **or** operational task card | Donut/pie only for valid parts of a meaningful whole; no useless decoration |
| Actionable work | Upcoming consultations, assignments, approval queues or deadlines in consistent table/list cards | Only authorized records/actions; distinguish pending, urgent and completed states |
| Feedback | Quiet loading state, empty/no-trend explanation, partial error, no-permission and preview note | Never show fake successful data after API failure |

### Responsive, accessibility and quality requirements

- Desktop (1440px): four cards when feasible, main/secondary analytical layout around 2:1 when both are useful; 1024px/768px reflow to two KPI columns and stacked charts as needed; 375px and 200% zoom prioritize readable one-column cards, touch targets and no horizontal page overflow.
- Keep meaningful contrast and tokens for light/dark, visible keyboard focus, clear chart text/tooltip plus nonvisual summary, units and `vi-VN` formatting. No unsupported animations or overloaded dashboards.
- Different roles **share visual patterns, not privileges**: Sales/CTV only sees its own approaches, invitations, proposals, follow-ups and authorized metrics; BGĐ uses its own authorized company view; Managers and Accounting likewise. Do not import BGĐ organization revenue into Sales.
- Only offer historical/monthly trend charts or period selectors when real authorized time-series/period APIs exist; do not turn present-day aggregate statistics into fictional month-by-month history. If data is missing, show empty/explanatory state or defer visualization.
- Check 375/768/1024/1440px, dark/light and 200% zoom with a live browser before claiming visual fidelity; source review alone is not visual verification.

### Reuse and scope

Use the existing `AppPageHeader`, `AppStatCard`, `ChartContainer`, `ChartTooltip`, `AdminListPanel` and `AdminIconAction` where applicable; no additional Dashboard framework, chart library or duplicate styles without an observed gap. This document sets a standard for **future authorized screen PRs**, not approval to change backend endpoints, finance definitions, roles, routes, or existing PR #138.

## Seven business roles (target UI)

Admin, BGĐ KIDSFIT, Kế toán, Quản lý bán hàng, CSKH, CHECKEE, Sales. The Sales UI is shared by employees and collaborators; partner/KIDSFIT Managers share business operations with strict organization scoping. **Currently implemented legacy role codes and workspaces still exist; this document alone does not migrate them.** Backend permissions remain authoritative.

- Admin: directories, partner/team accounts, school proposals, capacity and audit.
- BGĐ: KPIs, disputes, exceptions and policy; **not** a mandatory contract reviewer.
- Manager: pipeline, proposal forwarding, allocations, extensions, contract checks and direct submission to CHECKEE.
- CHECKEE: contract verification/reconciliation only; no internal payout information by default.
- Accountant: payment installments, outstanding debt, compliant commission/payout ledger.
- CSKH: verified handoff and post-sale cases.
- Sales: self-register or receive schools, track activity, request extension, submit contract and see own eligible income.

Business source: [roles](../requirements/ROLES_AND_PERMISSIONS.md), [workflows](../requirements/BUSINESS_WORKFLOWS.md), [rules](../requirements/BUSINESS_RULES.md). Commission 30% is **provisional**. Who at KIDSFIT performs the final 5-year protection grant after CHECKEE remains OPEN. No referrer/split workflow.

## Baseline UI review: Admin proposal screen

| Observation from screenshot + code | Design standard / later UI change |
| --- | --- |
| Page and list are visually coherent with KIDSFIT palette | Keep current shell, card, table and component APIs |
| Search submit, reset-filter and page refresh all exist | Clarify labels/semantics; reset ≠ refresh |
| Pending Admin proposal shows due timestamp earlier than screenshot date | Derived **Quá hạn** label for unresolved and actually expired records, computed from backend due timestamps; **no business status change** |
| Small icons edit/history/approve | Keep semantic labels, focus and confirmation for significant actions; larger touch targets where appropriate |
| Table min width and five columns | Keep local table overflow on mobile without losing important data |

**Not done in this documentation PR:** frontend component changes, redesign, runtime overdue calculation, responsive screenshot QA, role code migration or database/API changes.

## Skill and checks

Load [frontend design skill](../../.agents/skills/kidsfit-crm-frontend-design/SKILL.md) for visual tokens and component reuse and [Web App UX skill](../../.agents/skills/kidsfit-crm-webapp-ux/SKILL.md) for app-like experiences. From `frontend/`, run `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run test:pages`, `npm run build` when UI code changes; this Real API Only frontend has no `test:demo` script. Browser testing must be performed before reporting visual fidelity.

## Compact workflow notification UI (2026-11-23 reference)

- The shared bell in `frontend/src/components/layout/Header.tsx` uses the unified `/api/notifications` inbox and its existing paginated query. For UI work, read [Notifications & Events](../../.agents/skills/kidsfit-crm-dev/references/notifications-and-events.md) for event semantics; visual design must not create or alter server approval states.
- Approved compact pattern: popover about 320px wide (constrained by viewport), concise heading and unread count, three filters (`Tất cả`, `Chưa đọc`, `Cần xử lý`), simple divided rows rather than nested bordered cards, unread dot, one-line title with small timestamp, short two-line preview and meaningful action state when appropriate.
- Keep the list scrollable independently with a bounded height; the `Tải thêm` action must fetch actual backend pages through TanStack Query. Do not fabricate pagination or claim filter coverage beyond loaded pages.
- Respect semantic theme tokens, readable Vietnamese, keyboard/focus/touch access, no off-screen popovers and safe 320/375/390px layouts. The screenshot is user-supplied design reference; static source checks are **not** rendered visual QA.
