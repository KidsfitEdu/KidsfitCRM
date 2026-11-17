---
name: kidsfit-crm-webapp-ux
description: Design and review polished, responsive, app-like user experiences for KidsfitCRM on desktop, tablet and mobile web. Covers navigation, touch, safe areas, virtual keyboards, loading, overlays, motion and visual QA; complements the existing frontend-design and engineering skills.
---

# KIDSFIT CRM — Web App UI/UX

Use this repository-hosted skill when the request concerns **website-as-app usability**: mobile-first layouts, desktop/mobile navigation, touch interaction, responsive tables, keyboard-safe forms, Drawer/Sheet, micro-interactions or visual QA. It provides interaction and adaptation rules, **not** a new design system, native mobile application, installable PWA or authority to redesign unrelated pages.

## Source of truth and skill boundaries

Read in this order, selecting only relevant references:
1. Repository `AGENTS.md`, [Frontend Design System](../../../docs/design/FRONTEND_DESIGN_SYSTEM.md), and the current route/feature implementation under `frontend/src/`.
2. [Frontend Design Skill](../kidsfit-crm-frontend-design/SKILL.md): design tokens, component styles, icons, status semantics, role-specific presentation. Its existing references remain authoritative for visual language.
3. This skill's task-focused references:
   - [App-like visual language](references/app-like-design.md) — composition, density, navigation cues and design restraint.
   - [Responsive app shell](references/responsive-app-shell.md) — current Sidebar/Header/mobile bottom nav, breakpoints, safe areas.
   - [Interaction patterns](references/interaction-patterns.md) — loading, feedback, transitions, accessibility and input behavior.
   - [Mobile forms and overlays](references/mobile-forms-and-overlays.md) — sheets, modals, keyboard, form actions.
   - [Visual QA checklist](references/visual-qa-checklist.md) — evidence template for responsive usability.
4. For code, data, permissions, business rules, finance or architecture, additionally read [KIDSFIT CRM Dev](../kidsfit-crm-dev/SKILL.md) and the relevant approved requirements. UI must not bypass Backend authorization.

**Precedence:** explicit approved user scope and current decisions > verified live code, tests and API contracts for implemented behavior > current design system > this skill's recommendations. Report discrepancies instead of inventing product policy.

## Verified baseline to recheck each time

- React 19 + TypeScript, Vinext routing, Tailwind CSS 4, shadcn/ui/Base UI, Lucide, TanStack Query, Recharts; **not a migration to React Router or Next.js**.
- Entrypoint `frontend/src/app/page.tsx` → `frontend/src/components/crm/crm-app.tsx`; role views in `frontend/src/screens/`, shared components in `frontend/src/components/common/` and `frontend/src/components/ui/`, shell in `frontend/src/components/layout/`.
- Desktop Sidebar at `lg` expands to **248px** or collapses to **72px icon rail**, with toggle in Header and preference in localStorage; below `lg`, the existing mobile bottom navigation is used. Preserve the existing route/permission mapping.
- Frontend is **Real API Only**: `NEXT_PUBLIC_API_URL` must target the Backend. Never insert fake operational data, static demo login or mock responses as fallback.
- Source files, exports, branch HEAD and script names can change: re-inspect rather than blindly pasting this snapshot.

## Workflow for each UX request

1. **Clarify authorization:** screenshot/route, intended device and role, task outcome, allowed scope. If asked to confirm before code, provide analysis and **stop without editing, branching or PR**.
2. **Inspect the working experience:** inspect the current page, `Sidebar`, `Header`, `AppShell`, `globals.css`, nearby shared UI, data/error/loading states and tests. Describe where the UX friction occurs.
3. **Design the smallest improvement:** sketch hierarchy and interactions for narrow/medium/wide screens; specify focus, keyboard, touch, scroll, busy, empty, error and permission states. Avoid cosmetic work that harms usability.
4. **Reuse before adding:** prefer `AppPageHeader`, `AppButton`, `AdminListPanel/Toolbar`, `AppPagination`, `AppDrawer`, existing dialogs/toasts/loading and shadcn/Base UI primitives. Do not introduce a competing component library or broad global CSS changes.
5. **Implement only after approval:** preserve navigation, server RBAC, API behavior, financial/audit facts, pagination and query lifecycle. No PWA manifest/service worker, native SDK, offline cache or framework switch without a separate explicit request.
6. **Verify and hand off:** run relevant `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run test:pages`, `npm run build` from `frontend/`. Inspect actual rendered UI at documented viewports and input modes when a browser is available. Distinguish **PASS / FAIL / NOT RUN / BLOCKED**; do not claim visual parity from reading code only.

## Non-negotiable app-like UX

- Predictable, task-oriented navigation and persistent context; never hide required actions or truncate critical school/financial data without a way to reveal it.
- Mobile touch targets around **44 × 44 CSS px where practical**, real text labels or accessible names, keyboard focus, screen-reader landmarks, readable Vietnamese and correct `vi-VN` dates/currency.
- No page-wide horizontal scrolling from tables, clipped headers or overlay footers. Handle narrow screens, 200% zoom, dynamic viewport height, on-screen keyboard and safe-area insets intentionally.
- Skeleton for structural content loading, inline Spinner for scoped actions, clear progress/error/retry and accurate success only after confirmed server response. Keep data in view during refetch when safe.
- Subtle, meaningful motion; respect `prefers-reduced-motion`. Avoid motion or decorations that obscure work.
- Light and dark modes use existing semantic tokens and a consistent KIDSFIT green visual language. Design for all seven business roles without leaking unauthorized information.

**Deliverable:** identify the exact screens/components affected, approved visual direction, responsive behavior, accessible interaction contract, verification evidence and remaining risks. The skill itself changes **documentation only** until an independent UI implementation is approved.
