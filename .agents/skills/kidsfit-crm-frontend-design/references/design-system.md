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

## Approved visual references (2026-11-16): lists, actions and state

Use the user-supplied Admin **Nhân sự & đối tác**, **Quản lý trường học**, **Thông tin nhân sự** drawer, and **Mời Sales/CTV nhận trường** modal screenshots as a *visual brief*, not proof that every component already matches. The earlier proposal page remains a relevant example for its route. Adopt the shared brand and spacing, not identical field layouts on unrelated role screens.

### Visual hierarchy and proportions

- Desktop shell: deep-green sidebar and active item with lighter green background plus a left accent; white topbar with global quick search, theme switch, notifications and account avatar. Light-neutral page canvas.
- Page identity: short green uppercase role/breadcrumb eyebrow, strong headline, one-line muted description and a distinct right-aligned primary action. Tab underline follows the active section.
- Data panels: large rounded white card, restrained border/shadow, toolbar inside its top section, dark green table header with white high-contrast labels, white/near-white rows, fine dividers, balanced column widths and coherent footer pagination.
- Toolbar: long query field, status selector, orange search action, outlined icon reset; refresh remains **separate**. Prefer common heights, padding and radii. Do not force a one-row layout on small screens.
- Typography uses existing Inter/Be Vietnam Pro stack; meaningful hierarchy, readable Vietnamese diacritics and measured whitespace; use semantic CSS tokens and existing variants, not per-screen hardcoded hex values.

### Action icon color vocabulary

| Function | Semantic tone | Example Lucide | Notes |
|---|---|---|---|
| View/details | Green | `Eye` | Quiet green outline or icon |
| Edit | Blue | `Pencil` | Avoid confusing with info badge |
| Delete | Red/destructive | `Trash2` | Confirm destructive consequences |
| Archive | Amber/orange | `Archive` | Distinct from delete |
| Download | Cyan/teal | `Download` | Explicit file action |
| Restore | Violet | `RotateCcw` | Different from refresh/reset |

Action colors identify *action categories*, not individual rows; the same action keeps the same color across screens. Reuse or extend semantic component variants where justified. Buttons retain a consistent shape/size, subtle outlines, readable hover/focus/disabled styles and `aria-label`/tooltip. A single button must not change color just because its current record status changes.

### Status badge semantics

| Semantic state family | Badge tone | Examples (illustrative, not new server codes) |
|---|---|---|
| Valid / completed | Success green | Hoạt động, Đã xác minh hợp đồng |
| In progress | Informational blue | Đang tiếp cận, Đang xử lý |
| Waiting for action | Warning amber | Chờ xác minh, Chờ duyệt |
| Failed / rejected | Destructive red | Đã từ chối, Lỗi |
| Not started / no registration | Muted neutral gray | Chưa đăng ký, Chưa bắt đầu |
| Renewal / restoration | Violet | Tái ký, Khôi phục |

A state with distinct urgency may need a separate warning accent (e.g. *Quá hạn*); it must be computed from real timestamps, not conflated with `REJECTED`. One status code does **not** need a unique arbitrary color if it shares a semantic meaning. **Current status** is different from **required action**; never relabel backend status to fit a design. Badges use a soft background, restrained border and legible text, with optional icon but never color alone. Verify contrast for both themes.

### Detail panels, forms and toast treatment

- **Right-side drawer:** green branded header, visible close button, gentle dimmed background, profile/record summary, separate softly bordered rounded information cards with small green section icons, label-over-value fields and meaningful missing-value text such as *Chưa cập nhật*. Scroll content inside; keep footer accessible.
- **Form/modal:** similar green header, spacious white content, consistent large input/select/textarea, labels and required marks, clear two-column grouping on wide screens, single column on mobile, inline validation. Footer separates white neutral Cancel from green primary submit, with busy/disabled feedback.
- **Toast:** floating white card near top-right on desktop, restrained elevation, close button, semantic status icon, clear title and short secondary message; optional subtle timer indicator. Success green, error red, warning amber, info blue. Avoid blocking primary controls and duplicate messages, do not reveal private API detail.

## Dashboard visual system — BGĐ-inspired, role-specific (2026-11-17)

**Approved reference:** user-supplied screenshot of BGĐ *Tổng quan điều hành*: quiet light canvas, compact green eyebrow/heading, period control at the right, four evenly sized KPI cards (muted label + small soft-green icon + dominant value + timeframe), followed by a wide trend chart and narrower status-distribution panel. The layout is a reference for **quality and hierarchy**, not a requirement to copy BGĐ revenue data into other roles.

### Page composition and information hierarchy

- **Above the fold:** `AppPageHeader` with role-specific eyebrow, concise title, helpful description, and contextual period + refresh only if backed by real queries. Avoid large decorative hero headers pushing operational data down.
- **KPI row:** arrange four or fewer genuinely useful metrics in balanced `AppStatCard` tiles. Unified height, `rounded-2xl` styling via existing component, restrained surface/shadow, 12–20px internal rhythm (adjust to existing tokens), primary figures aligned and sized to withstand large VND amounts and long Vietnamese labels.
- **Below KPIs:** use a grid with broad analytical view and compact supporting view when both have value; e.g. 2:1 distribution on a wide desktop, 1-column stack as space shrinks. A second region may be “Công việc cần xử lý” or “Lịch tư vấn sắp tới” rather than a gratuitous pie chart.
- **Color:** brand green signals primary actions and positive trend, but negative/overdue/uncertain states use real semantic tones; never paint all charts green if it obscures distinctions. Reuse `--chart-*` tokens and dark-mode contrast.
- **Typography:** a small muted KPI label, a large tabular value, and small explanatory caption. Chart titles stay short with units/timeframe beside them; legends and tooltip labels in Vietnamese.

### Data visualization requirements

| Purpose | Pattern | Guardrails |
|---|---|---|
| Time series | Line/area chart | Real dated observations only; sorted periods, meaningful units, visible zero/axis context and tooltip |
| Category comparison | Bar chart | Comparable categories, clearly labeled axis and honest scale |
| Composition | Donut/pie chart | Few nonnegative categories with meaningful total; legend with values and clear no-data state |
| Operational priority | Table/list or alert card | Due date, owner/status, next action when authorized; do not force a chart |

Use existing Recharts `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`; ensure stable chart height and screen-reader equivalent summary/table where feasible. Do not show fake smooth trends, use unnecessary chart animations or assume aggregate totals provide history.

### Role-aware examples (not mandatory widgets)

- **Sales/CTV:** active school approaches, approaching-expiry alerts, invitations awaiting acceptance and proposals awaiting processing; real dated contact activity or consultation schedule if available. Do **not** show BGĐ organization-wide revenue.
- **BGĐ:** authorized enterprise KPIs and trend/status mix, as already exemplified by `BoardDashboardPage.tsx`.
- **Manager:** team allocation, follow-ups and pending approvals within assigned scope.
- **Accounting:** actual reconciled amounts and payment due/approval within accounting permissions.

A KPI marked “current state” must not silently change when the user selects a report month unless the underlying API truly supports historical snapshots. No period selector without a corresponding data source. Never use zeros to mask missing/forbidden/loading data. A role’s correct, limited dashboard is more professional than a misleading large one.

## Accessibility and motion

- Aim for WCAG AA: 4.5:1 normal text contrast, 3:1 large text/meaningful nontext UI; verify actual computed colors and dark-mode contrast.
- All icon-only buttons have \`aria-label\` and visible keyboard focus; dialogs restore focus and expose titles; form errors are attached to fields.
- Prefer short 150–200ms transitions; honor reduced motion and never convey state through animation alone.
- Display amounts with \`Intl.NumberFormat('vi-VN')\` or existing helpers and do not render currency/PII in public demo without authorization.

## Do not change via a design-only task

No global token migration, no role migration, no new status machine, no financial default, no unrequested components. Log proposed improvements and handle them as separately scoped changes.
