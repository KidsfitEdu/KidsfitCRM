# KIDSFIT UI design system — tokens and visual language

Source inspected: \`frontend/src/app/globals.css\`, \`frontend/src/components/common/app-button.tsx\`, \`frontend/src/components/common/admin-list-ui.tsx\`, screenshot of Admin > Quản lý đề xuất trường supplied on 2026-10-30. Current CSS contains earlier \`:root\` blocks and later brand overrides; inspect **effective computed styles**, not only the first token declaration.

## Intent

Keep a professional, calm B2B operations UI: deep-green branded navigation, neutral/light canvas, clear hierarchy, dense but legible tables, lightweight status colors. Do **not** reinterpret the screenshot as an invitation to redesign or recolor the whole app.

| Semantic use | Existing reference value | Current source location | Instruction |
| --- | --- | --- | --- |
| Sidebar / deepest green | \`#0e2a1a\` | \`--deep\`, \`--sidebar\`, \`.crm-brand-sidebar\` | Identity/nav background, never generic text area |
| Primary green | \`#1b5e20\` | \`--primary\`, \`--button-green\`, table head | Main approve/save actions and navigation accents |
| Primary hover | \`#124c17\` | \`--button-green-hover\` | Interactive hover state |
| Soft green | \`#a5d6a7\` | \`--light\`, nav/sidebar accents | Selected items, soft backgrounds/borders |
| Info/secondary blue | \`#0369a1\` | \`--button-blue\` | Informational or secondary action where existing UI uses it |
| Attention orange | \`#d97706\` | \`--button-orange\` | Search/attention accent in existing toolbar; not a generic success state |
| Destructive | \`#be123c\` | \`--destructive\`, AppButton danger | Delete/reject destructive actions only |
| Workspace background | \`#f9fafb\` | \`--background\` | Page canvas |
| Cards | \`#ffffff\` | \`--card\` | Tables, form panels and dialogs |
| Body copy | \`#111827\` | \`--foreground\` | Primary text |
| Muted copy | \`#6b7280\` | \`--muted-foreground\` | Captions/help text |
| Borders | \`#e5e7eb\` | \`--border\` | Panel/table/input dividers |

These are **existing reference values**, not a license to repeat hardcoded hex codes in new UI. Prefer current semantic classes and component variants; use a brand-specific class where already established. Dark mode is separately declared in \`.dark\`; never hardcode white-on-white or light-only status styling.

## Typography, spacing and layout

- Typeface stack from \`--font-brand\`: \`Inter\`, \`Be Vietnam Pro\`, system sans; Vietnamese marks must remain readable.
- Page header hierarchy: eyebrow (small, uppercase green) → meaningful \`h2\` title → muted one-line supporting text → contextual page action. Use \`AppPageHeader\`.
- Shared workspace: \`max-w-[1480px]\`, \`px-4\` at mobile and \`sm:px-7\` on larger screens, with \`space-y-5\`; sidebar \`w-[248px]\` on \`lg\`+. Preserve original shell unless requested.
- 4/8-based spacing vocabulary; reuse \`gap-2/3/4\`, \`p-4/5/6\`, \`rounded-xl/2xl\` where appropriate; avoid arbitrary values each new screen.
- Controls generally \`h-10\` or \`h-11\`, with rounded corners; give icon actions readable tooltips/labels and ≥44px touch hit area on touch layouts when feasible (current \`AdminIconAction\` is 36px and may need context-specific wrappers).
- Cards use subtle \`crm-brand-surface\` shadow, 1px border, and uncluttered white body; do not add extra colorful containers just for emphasis.
- Tables use strong green header with white uppercase labels and comparatively neutral rows. Use semantic table markup and right-align amounts; preserve leading zeros of school codes and locale-formatted dates.

## Color and status meanings

| Meaning | Treatment |
| --- | --- |
| APPROVED / ACTIVE / completed | Green, with explicit text |
| PENDING_MANAGER / PENDING_ADMIN | Blue/neutral label showing **who** must act |
| DUE_SOON | Attention orange with remaining time text |
| OVERDUE | Orange/red warning + \`Quá hạn\` text, only when due timestamp is truly past and item unresolved |
| REJECTED / CANCELLED / failure | Red/rose with reason and status text |
| INFO / read-only | Blue/neutral |

Status colors supplement labels; they are not data state transitions. An overdue indicator must not mutate \`PENDING_ADMIN\` or another canonical business state. Never compute overdue from a sample screenshot date; use parsed authoritative server time and the user's view timezone.

## Accessibility and motion

- Aim for WCAG AA: 4.5:1 normal text contrast, 3:1 large text/meaningful nontext UI; verify actual computed colors and dark-mode contrast.
- All icon-only buttons have \`aria-label\` and visible keyboard focus; dialogs restore focus and expose titles; form errors are attached to fields.
- Prefer short 150–200ms transitions; honor reduced motion and never convey state through animation alone.
- Display amounts with \`Intl.NumberFormat('vi-VN')\` or existing helpers and do not render currency/PII in public demo without authorization.

## Do not change via a design-only task

No global token migration, no role migration, no new status machine, no financial default, no unrequested components. Log proposed improvements and handle them as separately scoped changes.
