# Frontend design and component rules

## Stack and actual entrypoints

React 19, TypeScript, Vinext/Vite, Tailwind CSS 4, shadcn/ui, Lucide, TanStack Query. Routes `frontend/src/app/`; screens `frontend/src/screens/`; shared primitives `frontend/src/components/common/` and `frontend/src/components/ui/`; shell `frontend/src/components/layout/`; API `frontend/src/services/api.client.ts`; tokens `frontend/src/app/globals.css`. No new routing framework or second design system.

## Visual baseline

The repository's documented screen reference is **Admin → Quản lý đề xuất trường** (2026-10-30). Actual screenshot is not part of this bundle; inspect user-supplied visual when provided. Brand reference: deep green sidebar `#0e2a1a`, primary green `#1b5e20`, hover `#124c17`, light neutral workspace `#f9fafb`, white cards, blue information `#0369a1`, orange attention `#d97706`, destructive rose `#be123c`. These are **reference token values only**; use CSS semantic variables / existing component variants instead of hardcoding in each file. Preserve dark mode.

## Reuse candidates, inspect source first

- `AppPageHeader` for breadcrumb/eyebrow/title/action hierarchy.
- `AppButton` for primary/secondary/destructive actions.
- `AppNativeSelect` and existing shadcn form/input/dialog primitives.
- `AdminListPanel`, `AdminListToolbar`, list/filter building blocks.
- `AppPagination`, `AppEmptyState` and existing loading/error rendering.
- `AppShell`, `Sidebar`, `Header` for navigation/layout.

If exact symbol is absent at current HEAD, locate the live equivalent; do not invent imports. Do not add a duplicate generic `Button`, `Table`, `Modal`, `Card` unless existing primitives are demonstrably unsuitable.

## Uniform UI contract

- Same sidebar, header, typography, card spacing, button sizes, filter row, table columns, pagination, badges and dialogs across role screens, adjusting content and access rights rather than rebuilding the shell.
- Explicit loading, network error, empty data, no search results, permission denied, disabled/processing/success states.
- Search, reset filters and refresh are separate actions. Keep pagination and query cache predictable; keys must include organization/user scope, and sensitive caches cleared on logout.
- Responsive at 375, 768, 1024, 1440 px, 200% zoom; no page-wide horizontal overflow; table overflow scoped inside a panel. Current layout documents desktop sidebar ~248px at `lg`, bottom navigation below `lg`.
- Semantic headings, table headers, labels, meaningful button names, keyboard focus, dialog focus management, 44px-friendly touch controls where possible, text labels with status colors, `aria-label` for icons, reduced motion, and adequate contrast.
- Vietnamese diacritics readable, dates/amounts formatted for `vi-VN`, timezones explicit. Distinguish source DTO status from display status: overdue display must not mutate a canonical workflow state.
- Screenshot work requires actual render comparisons to claim visual parity. Existing `goi.jpg` is not the CRM page unless user explicitly declares it a UI reference.

## UI workflow

Find current page and component consumers → inspect tokens → propose minimal modifications → reuse shared primitives → connect real data/permissions → verify interactions → lint/typecheck/build → visual QA where available.

## Kidsfit status and action badges (Accounting example)

Status is **what is happening**; Action is **what this role must do**. A badge color must communicate its role alongside icon and text. Scope role-specific variants (`kidsfit-service`, `kidsfit-action`) to Accounting unless a shared design change is approved.

| Class | Semantic color | Examples |
|---|---|---|
| Current service | soft green | Đang sử dụng |
| Upcoming expiry | soft yellow | Sắp hết hạn |
| Interruption | soft orange | Gián đoạn |
| Exactly 12-month milestone | soft pink | Đủ 12 tháng |
| Past milestone | soft red | Quá 12 tháng |
| Released protection | neutral gray | Đã hết bảo vệ (real decision only) |
| Review/exception | soft violet | Cần rà soát / Kiểm tra kỳ dịch vụ |
| Accounting confirmation | soft sky blue | Xác nhận tái ký |

Keep design restrained, ensure contrast in Light/Dark, no color-only meaning, and avoid tinting whole rows for a status that already has a colored badge. A screenshot may be used to correct **one cell** without restructuring the entire table. Preserve an 8-column contract table when the request only changes its status or action cell.

When showing finance in a table cell: **label first, then figure**; “Giá trị hợp đồng”, “Thực thu” and “Hoa hồng ghi nhận” are distinct. Do not invent card borders when user requests text order only. Full detail in Drawer, not a second redundant table.