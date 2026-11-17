# Responsive app shell, safe areas and navigation

Read current source before applying rules:
- `frontend/src/components/crm/crm-app.tsx`
- `frontend/src/components/layout/{Sidebar,Header,AppShell}.tsx`
- `frontend/src/config/{navigation,routes}.ts`
- `frontend/src/app/globals.css`

## Current shell contract (verify on target HEAD)

- At **lg (1024px and above)**: desktop Sidebar expands to 248px or collapses to a 72px icon rail; Header holds its collapse/expand toggle. The page's left offset tracks Sidebar width. Keep its localStorage preference and active route indication.
- Below **lg**: use existing fixed horizontal **bottom navigation**. Desktop Sidebar/toggle is hidden. Do not introduce a competing hamburger menu or replace the current app shell without specific approval.
- Header is sticky; content constrained to approximately 1480px at wide widths. Long user names and Vietnamese labels must not push search, theme, notification or profile controls outside the viewport.

## Verification matrix

| CSS viewport width | Expected review |
| --- | --- |
| 320–399px | Narrow phone; one-column content; bottom nav and long labels remain usable; no page-wide horizontal overflow |
| 400–767px | Phone; accessible touch targets; forms and toolbars stack; virtual keyboard avoids action obstruction |
| 768–1023px | Tablet; bottom nav remains per existing breakpoint; balanced two-column areas where legible |
| 1024–1439px | Laptop; Sidebar can be 248/72px; header/toolbar wrap appropriately |
| 1440px+ | Desktop; controlled content width, stable table/filters/Drawer placement |

Also test **200% browser zoom**, landscape phone and increased text size. CSS viewport may change under zoom; do not force desktop layout when it no longer fits.

## Mobile navigation and scrolling

- Bottom nav remains reachable while not obscuring actionable content, including pagination and toast. Check `env(safe-area-inset-bottom)` support if the actual layout needs it; do not add global padding blindly.
- A long role menu may need horizontally scrollable navigation; show enough affordance for discoverability and maintain keyboard/focus access.
- Preserve selected menu semantics (`aria-current` or equivalent), title tooltip for icon-only collapsed Sidebar, and correct links/handlers. A visual badge or icon cannot grant permission.
- Tables use a contained `overflow-x-auto` wrapper, not page-wide scroll; optional mobile cards require explicit row/field/action mapping and approval.
- Keep native scrolling usable; custom scrollbar styling should not obscure draggable areas or cause scroll traps. Avoid both nested page scroll and nested panel scroll unless each serves a clear need.

## Fixed, sticky and overlay regions

- Prefer `min-h-dvh`/`h-dvh` when a full viewport panel requires dynamic viewport behavior; test against iOS/Android browser chrome.
- Account for the on-screen keyboard when designing actions in modals and forms. Allow internal scroll to focused fields; avoid footer overlap or fixed pixel heights that hide submit.
- Respect device notches and home indicators in any newly authorized fixed bottom region using appropriate safe-area insets.
- Modal overlays may lock background scrolling, but must restore page scroll, focus and context after close.
- Preserve `prefers-reduced-motion` and avoid layout animation during essential keyboard navigation.
