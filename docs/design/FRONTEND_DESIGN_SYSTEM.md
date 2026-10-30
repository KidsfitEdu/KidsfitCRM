# KIDSFIT CRM — Frontend Design System

**Version:** 2026-10-30. **Purpose:** one consistent presentation language for the seven-role school-sales CRM, while respecting existing frontend code, legacy role compatibility and business rules. **Reference screen:** user-provided Admin → Quản lý đề xuất trường image dated 30/10/2026. That image is **not committed**; inspect the source and, when available, render the live UI to compare.

## Source architecture as of 2026-10-30

The Vinext/React frontend now uses `frontend/src/app/` for routes, `frontend/src/screens/` for role pages, `frontend/src/components/` for shared UI, `frontend/src/config/` for navigation, and `frontend/src/services/` for API clients. Current role page registries are `frontend/src/config/navigation.ts` and `frontend/src/config/role-pages.ts`. Seven **business** roles still coexist with legacy distinct `SalesStaff` and `Collaborator` presentation workspaces until the explicitly reviewed code migration is implemented. Read [current source map](../implementation/CURRENT_SOURCE_MAP.md) and [architecture](../../frontend/docs/architecture.md) before implementing UI.

## Reference implementation

- App shell and role navigation: \`frontend/src/components/crm/crm-app.tsx\`.
- Active brand tokens and dark theme: \`frontend/src/app/globals.css\` (later KIDSFIT \`:root\` definitions override earlier theme defaults).
- Shared components: \`frontend/src/components/common/app-page-header.tsx\`, \`app-button.tsx\`, \`app-native-select.tsx\`, \`app-pagination.tsx\`, \`app-empty-state.tsx\`; Admin list components at \`frontend/src/components/common/admin-list-ui.tsx\`.
- Admin proposal screen: \`frontend/src/screens/Admin/Proposals/ProposalsPage.tsx\`; preserve current API handlers and permission controls.
- Stack: React 19, TypeScript, Vinext, Tailwind CSS 4, shadcn/ui, Lucide Icons, TanStack Query. Do not introduce a different UI framework from a design-only request.

## Design language

Deep-green fixed sidebar \`#0e2a1a\` (desktop width 248px), bright near-white workspace \`#f9fafb\`, green table head/primary \`#1b5e20\`, white card \`#fff\`, softened green navigation selection and subdued borders/shadows. Blue \`#0369a1\` is informational/secondary; orange \`#d97706\` is attention/search accent; destructive actions use \`#be123c\`. **Prefer semantic CSS tokens and shared button components, not freshly hardcoded hex values.** Use Vietnamese-friendly Inter/Be Vietnam Pro fallback and clear heading/body hierarchy.

- Header: small green uppercase eyebrow, meaningful page title, muted description, page-level action on the right; wraps on narrow screens.
- Workspace: constrained width, \`space-y-5\`, cards with \`rounded-2xl\`, subtle borders/shadows.
- Inputs and selects: clear accessible labels, consistent heights and radius; focus visible.
- Tables: full context on desktop, horizontal scrolling **inside** panel on small screens, semantic headers; appropriate status chips and aligned date/amount.
- Actions: primary green for commit/approve, orange search/attention where existing pattern uses it, blue information/refresh, outline reset. Do not rely on color to explain role. Icon actions require text labels accessible to assistive technology.
- States: loading, no data, no match, forbidden, error, success, disabled and preview/demo have distinct presentation.
- Dark mode: use \`.dark\` token variants; verify contrast and focus, not just background colors.
- Responsive: existing shell uses fixed left sidebar at \`lg\` and bottom navigation below \`lg\`; aim for usable layouts at 375 / 768 / 1024 / 1440 px and 200% zoom.

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

Load [frontend design skill](../../.agents/skills/kidsfit-crm-frontend-design/SKILL.md) and its focused references for tokens, component map, responsive matrix, role-specific UX and QA checklist. From \`frontend/\`, run \`npm run lint\`, \`npx tsc --noEmit\`, \`npm run build\`; run \`npm run test:demo\` when demo state/navigation changes. Browser testing must be **actually performed** before reporting visual fidelity.
