---
name: kidsfit-crm-frontend-design
description: Design, implement, refine, review, and visually QA KidsfitCRM frontend screens using the existing KIDSFIT green design language, React 19, TypeScript, Tailwind CSS 4, shadcn/ui and Lucide. Use for layout, tables, forms, navigation, status badges, responsive/mobile, accessibility, dark mode, screenshots and role-specific UI. Not a replacement for the domain engineering skill.
---

# KidsfitCRM Frontend Design

Use this skill **only for KidsfitCRM frontend work**. Use the user-provided CRM Admin **staff/partners list**, **schools list with success toast**, **staff detail drawer**, and **Sales/CTV allocation modal** screenshots (2026-11-16) as the newest *visual references* for future UI work; retain the older Admin proposal reference for its specific screen. Screenshots are not executable code or proof of runtime behavior. The repository's actual components and tokens are implementation references.

## Source layout warning (2026-10-30)

Current frontend architecture is `frontend/src/app/` for Vinext pages, `frontend/src/screens/` for role views, `frontend/src/components/` for reusable UI, `frontend/src/config/` for navigation and `frontend/src/services/` for API clients. Check `docs/implementation/CURRENT_SOURCE_MAP.md` and `frontend/docs/architecture.md`. Do not use old `frontend/components/` paths or create duplicate role pages. The Admin proposals screen is `frontend/src/screens/Admin/Proposals/ProposalsPage.tsx`. Preserve legacy routes and SalesStaff/Collaborator workspaces until a tested compatibility migration.

## Read first, in this order

1. Repository \`AGENTS.md\`, then \`docs/design/FRONTEND_DESIGN_SYSTEM.md\`.
2. Inspect the actual view, nearby components, \`frontend/src/app/globals.css\`, its data/loading/permission paths, and related tests.
3. Read only relevant reference(s):
   - [Design system](references/design-system.md): color, spacing, type, hierarchy and states.
   - [UI components](references/ui-components.md): forms, actions, tables, messages.
   - [Responsive layout](references/responsive-layout.md): shell, breakpoints and overflow.
   - [Role-based UI](references/role-based-ui.md): target seven roles and security boundaries.
   - [UI review checklist](references/ui-review-checklist.md): implementation and visual verification.
4. If an action, status, policy, permission or source-of-truth is involved, additionally read \`.agents/skills/kidsfit-crm-development/SKILL.md\` and relevant \`docs/requirements/\` files. **Frontend design rules never override business rules, backend authorization or financial policy.**

## Workflow for every UI task

1. **Scope:** Identify route/view, role(s), purpose, source screenshot if any, real vs preview/demo data, devices and requested changes. If a user explicitly asks to confirm first, **describe the proposed change and stop before editing**.
2. **Inventory:** Locate current shared components, tokens, layout, existing states, CSS selectors and permissions. Prefer reuse over duplication; do not rebuild a complete screen because one component needs adjustment.
3. **Plan:** Describe hierarchy, interaction semantics, empty/loading/error/success/disabled/permission states, small-screen treatment, and any business assumptions. No new pages, endpoints, user roles or policy values unless requested.
4. **Implement:** Preserve the green KIDSFIT brand, typography and CSS variable contract. Reuse AppPageHeader, AppButton, AdminListPanel/AdminListToolbar, AppNativeSelect, AppPagination, AppEmptyState, shadcn/ui primitives and Lucide icons where suitable. Keep Vietnamese UI strings accurate and semantic actions accessible.
5. **Protect functionality:** Search, filters, reset, refresh, pagination, approval/rejection, dialogs and keyboard navigation must remain wired. Apply backend-issued permissions + record scope; hiding a button is **not** security.
6. **Verify:** Run relevant frontend lint, TypeScript, tests and build. When a runnable browser is available, compare against screenshot/design at desktop, tablet, mobile, dark mode and zoom. **Do not claim visual testing without actually seeing the rendered output.** Report checks run and blockers.

## Approved shared visual contract — list, actions, status, drawer, form and toast (2026-11-16)

These are **design instructions for later authorized frontend changes**, not permission to redesign all pages or alter business behavior. Follow the screenshots' hierarchy without pixel-copying different workflows. Detailed rules live in [Design system](references/design-system.md), [UI components](references/ui-components.md), [Responsive](references/responsive-layout.md), and [UI review checklist](references/ui-review-checklist.md).

1. **App shell + list:** deep-green navigation with distinguishable active item; white topbar with quick search, theme, notifications and profile; light workspace; green uppercase eyebrow, bold page heading, brief description, right-side primary action. A rounded white list panel contains a consistent search/status/search-button/reset toolbar, dark-green table header, neutral rows, meaningful badges, icon actions and footer pagination. Keep search, reset filters and data refresh **separate**.
2. **Action icon semantics:** different *action types* use distinct, consistent semantic tones: view = green (Eye), edit = blue (Pencil), delete = red (Trash2), archive = orange (Archive), download = cyan (Download), restore = violet (RotateCcw). Do not assign random colors to each row. Reuse the project's icon/button variants and token system; do not hardcode hex values in screens. Provide tooltip, Vietnamese accessible name, focus, disabled/busy and confirmation for destructive actions.
3. **Status badges:** distinguish actual **business states** through stable semantic families: active/verified = green, in-progress = blue, pending/review = amber, rejected/error = red, not-started = neutral gray, renewal/restoration = violet where appropriate. Match the **actual state meaning and urgency**, not blindly a word; multiple states may share a family, and overdue urgency is derived without changing server state. Rounded light badges always include readable text, contrast in light/dark and meaningful optional icon.
4. **Detail drawer:** right-hand panel with branded green title header and close control, dimmed backdrop, profile/record summary and rounded grouped sections with icons, labels above values, status badges, internal scroll and anchored footer where needed. Use a common existing Drawer/Sheet if available; preserve business-specific section content. Keyboard Escape, focus trapping/return, disabled/loading/error and small-screen behavior are required.
5. **Form/modal:** branded green heading/close, white spacious content, accessible labels and required markers, consistent input/select/textarea sizes and green focus, two columns only when readable and one column on mobile, field-level validation and a right-aligned footer (secondary Cancel, primary green Submit). Prevent duplicate submits; don't claim success before backend confirmation.
6. **Toast:** prefer the existing `app-toast-provider.tsx`; top-right on desktop, non-obstructive on mobile, rounded white floating notice with icon, concise title/supporting text, optional unobtrusive remaining-time indicator and dismiss control. Success green, error red, warning amber, info blue; loading remains pending until authoritative completion. Ordinary dismissible feedback may auto-dismiss after about 4–5 seconds; important errors need adequate reading time. Avoid duplicate alerts and leaking sensitive details.
7. **Reuse + QA:** build upon `AppPageHeader`, `AppButton`, `AdminListPanel`/`AdminListToolbar`, `AppPagination`, existing status/icon actions, form controls and Dialog/Sheet; never add a parallel design system or indiscriminate global CSS. Check 375/768/1024/1440px, 200% zoom, light/dark, keyboard/ARIA, permission/loading/empty/error states. Only claim screenshot fidelity after a live browser comparison.

## Design and engineering invariants

- Brand: dark-green sidebar, white/light neutral workspace, green primary actions, restrained orange/blue emphasis. Prefer semantic tokens (\`bg-card\`, \`text-foreground\`, \`border-border\`) and existing \`crm-brand-*\` classes. No new global palette overriding \`globals.css\` without explicit decision.
- Responsive shell already uses a **248px sidebar at \`lg\`** and bottom navigation below \`lg\`. Prevent off-screen forms and page-wide horizontal scrolling; scope table scrolling to the table container.
- Interactive states: distinguish filter reset from data refresh, visually and accessibly identify overdue *pending* work based on authoritative timestamps, require confirmation for destructive/high-impact actions, and display server errors precisely.
- Accessibility: semantic page headings and table headers, associated labels, keyboard focus, no color-only statuses, useful \`aria-label\` for icon-only actions, sufficient contrast and sensible touch targets.
- Target business model: seven roles with one \`SALES\` UI for employees and CTV; existing \`BOARD\`, \`CHANNEL_SALES\`, \`PARTNER_ADMIN\`, \`PARTNER_COLLABORATOR\` are **legacy implementation codes**, not permission to delete existing account data. Follow \`docs/requirements/ROLES_AND_PERMISSIONS.md\`.
- Treat the 30% Sales commission as **provisional** and the KIDSFIT post-CHECKEE 5-year grant actor as **OPEN**. Do not invent UI affordances that implicitly approve them.
- Avoid importing personal referrer/split commissions; feature was explicitly excluded.
- Changes to screenshots/layout must not silently modify business data, APIs, auth flows, migrations, demo/prod semantics or architecture.

## Verification commands

From \`frontend/\` (after dependencies are installed): \`npm run lint\`, \`npx tsc --noEmit\`, \`npm run build\`; run \`npm run test:demo\` when modifying demo navigation/state. Use tests and checks only for the scope touched and report their actual results. For business permissions/transactions also follow engineering skill and backend test requirements.

## Handoff

Summarize files changed, behavior preserved/added, responsive and accessibility checks, lint/build/test results, and any remaining screenshot differences. For screenshots supplied only in chat, explain that the repo contains a written screen contract rather than falsely claiming the screenshot is checked into Git.
