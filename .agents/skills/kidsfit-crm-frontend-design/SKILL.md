---
name: kidsfit-crm-frontend-design
description: Design, implement, refine, review, and visually QA KidsfitCRM frontend screens using the existing KIDSFIT green design language, React 19, TypeScript, Tailwind CSS 4, shadcn/ui and Lucide. Use for layout, tables, forms, navigation, status badges, responsive/mobile, accessibility, dark mode, screenshots and role-specific UI. Not a replacement for the domain engineering skill.
---

# KidsfitCRM Frontend Design

Use this skill **only for KidsfitCRM frontend work**. Treat the shared Admin > "Quản lý đề xuất trường" screenshot (2026-10-30) as a **visual reference**, not executable code or proof of live behavior. The repository's actual components and tokens are implementation references.

## Read first, in this order

1. Repository \`AGENTS.md\`, then \`docs/design/FRONTEND_DESIGN_SYSTEM.md\`.
2. Inspect the actual view, nearby components, \`frontend/app/globals.css\`, its data/loading/permission paths, and related tests.
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
