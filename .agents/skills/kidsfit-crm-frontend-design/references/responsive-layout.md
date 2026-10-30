# Responsive layout and state coverage

Current KIDSFIT shell source: \`frontend/components/crm/crm-app.tsx\` and \`frontend/app/globals.css\`. Existing desktop sidebar is \`w-[248px]\` at \`lg\`; mobile/tablet get bottom navigation below \`lg\`; header is sticky and content wrapper is \`max-w-[1480px]\`. New UI must fit the shell, not replace it.

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
