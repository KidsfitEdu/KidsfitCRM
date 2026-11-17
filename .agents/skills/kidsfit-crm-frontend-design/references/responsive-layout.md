# Responsive layout and state coverage

Current KIDSFIT shell source: \`frontend/src/components/crm/crm-app.tsx\` and \`frontend/src/app/globals.css\`. Existing desktop sidebar is \`w-[248px]\` at \`lg\`; mobile/tablet get bottom navigation below \`lg\`; header is sticky and content wrapper is \`max-w-[1480px]\`. New UI must fit the shell, not replace it.

## Expected behavior by viewport (check representative widths)

| Width | Navigation | Content | Tables/actions |
| --- | --- | --- | --- |
| 320–399px | Existing bottom navigation; keyboard-aware | One column, compact header and wrapped toolbar | No page-level horizontal overflow; use contained table scroll or deliberate cards |
| 400–767px | Bottom nav | One-column filters, full-width fields as needed | Buttons comfortably tappable, readable labels and dialogs |
| 768–1023px | Bottom nav per existing \`lg\` breakpoint | Multi-column where content fits; avoid squeezed search | Table internal horizontal scrolling where required |
| 1024–1439px | Sidebar appears, 248px | Content respects sidebar, search and page actions wrap | Table columns proportionate to remaining width |
| 1440px+ | Sidebar, desktop topbar | Constrained to existing max width | Full table and toolbar alignment |

These are **test viewports**, not new breakpoint definitions. Use project Tailwind utilities (\`sm/md/lg/xl\`) and actual component measurements; do not add a new screen-specific global breakpoint without reason.

## Header, navigation and content

- Preserve sticky topbar, global search, theme toggle, notifications and profile; do not turn local filter into global search.
- Active navigation needs visual highlight **and** current semantics; do not rely on hue alone.
- Below \`lg\`, account for the fixed bottom nav using existing page padding and safe-area behavior; forms/dialog footers must not be occluded.
- Use \`min-w-0\` on flex children, wrapping toolbar controls, and predictable min/max field widths. A 760px min-width table belongs in a scrollable panel; never force \`body\` horizontal scroll.
- Text truncation must not hide full school names/meaningful amounts permanently: tooltip/expanded detail should remain available.

## Interaction at small widths

- Filter toolbar: search input first, status select next, submit/reset clearly distinct. On mobile stack/wrap without icon-only mystery actions.
- Row actions: preserve Sửa/Lịch sử/Duyệt with accessible names and visible focus; for touch, target ~44×44px where practicable without crowding.
- Forms: auto layout fields from 2 columns to 1; keep keyboard input and select labels visible; dialogs \`max-h\` with inner scroll.
- Date/amount: \`tabular-nums\`; keep expiry and overdue readable, avoid ambiguous two-digit years on cramped screens.

## Responsive contracts for the approved list, drawer, modal and toast examples

- **List toolbar:** at ≥1024px aim for one balanced row with a flexible search field, status dropdown, Search and Reset actions; when width is insufficient, wrap logically without squashing input labels or hiding the primary button. Below 768px stack fields/actions in usable order, keeping icon-only Reset labeled accessibly.
- **Table and row actions:** preserve strong green header and semantic column headings. Desktop rows have stable widths and neutral separators. Small screens scroll *inside the panel* or use a deliberately reviewed card presentation; keep actions, status, important dates and pagination reachable. Icons remain recognizably distinct by action type even when text is hidden.
- **Drawer/Sheet:** right-side at roughly 480–560px where space allows; on small screens use almost/full available width with no page-wide overflow. Branded header and dismiss affordance stay visible; body has its own vertical scroll; anchored footer, if present, is not covered by bottom navigation, viewport safe area or virtual keyboard.
- **Form/dialog:** use a two-column grid on roomy desktop only if each control remains legible; collapse to one column for narrow widths. Limit overall height to the visible viewport and scroll the content, not the entire page. Header/close and Cancel/Submit must remain usable when textarea is long or mobile keyboard is open.
- **Toast:** top-right desktop with adequate inset, not covering key page actions for extended periods; on mobile cap its width to viewport, use safe-area spacing and avoid the bottom navigation and modal footer. Cap simultaneously visible notifications and handle long Vietnamese messages without clipping.
- **Focus and modal interaction:** manage focus trap/return, Escape close where allowed, background inertness, scroll lock and readable field errors. Verify touch, keyboard-only and 200% zoom for all four patterns.
- **Color at different widths/themes:** distinguish semantic action-icon tones and status badge categories by text/icon and contrast, not hue alone; ensure dark tokens exist rather than hardcoded light-only styles.

## Dashboard responsive and accessibility contract (BGĐ reference)

- **1440px desktop:** show up to four equal KPI tiles across one row if space allows; below, optionally a wider main trend panel and narrower contextual status/task panel (roughly two-thirds / one-third) when both have meaningful content. Maintain breathing room rather than filling every pixel.
- **1024px laptop:** allow KPI cards to reflow to two columns when labels/values would clip. Chart cards stack or share columns only if axes, legends and buttons remain readable.
- **768px tablet:** two-column KPI grid where legible; single-column chart/insight regions. Period selector and refresh wrap under/alongside title without colliding with breadcrumb.
- **375px phone (also 320px edge cases):** one KPI tile per row when long Vietnamese labels or VND amounts demand it; avoid horizontal page scrolling and ensure chart panels stay inside viewport. If two small cards fit, they must remain accessible at 200% zoom; do not force two columns solely to match screenshot.
- **Chart responsiveness:** stable aspect/height, legible ticks, units and legend; rotate/reduce labels as needed, not hide all context. On narrow screens prefer compact tooltip/table alternative, and no inaccessible off-screen chart controls.
- **Interactions:** filter and refresh have accessible labels, keyboard focus, loading feedback; charts must provide text/summary for screen reader users. Touch targets and tasks stay reachable below mobile bottom navigation.
- **Data state at all widths:** check long amounts, missing values, loading, empty chart, partial error, no permission, and dark mode. No claim of chart correctness without actual API/source verification, and no visual test PASS without browser observation.

## Dark mode and zoom

- Verify all table headers, badges, hover, inputs, selected navigation and focus states against \`.dark\` tokens. Existing \`AppButton\` and \`AdminIconAction\` provide dark variants; reuse before overriding.
- Test 200% browser zoom at desktop-equivalent width; essential UI may reflow but must remain operable.
- Honor reduced motion for loading/hover effects where feasible; avoid dependency on motion to indicate result.
- Check with keyboard-only and touch. Reaching submit actions must not require horizontal scrolling to inaccessible regions.

## Verification matrix (minimum when changing UI)

- Widths: 375px, 768px, 1024px, 1440px (add 320px for dense dialogs/tables).
- Themes: light and dark at relevant widths.
- States: no results, one result, long school name, many results, loading, error, no permission, overdue pending, resolved.
- Input modes: mouse, keyboard tab/Enter/Escape, touch when available.
- If no browser access, report **not visually verified**; do not claim pixel-level fidelity based on static code review.
