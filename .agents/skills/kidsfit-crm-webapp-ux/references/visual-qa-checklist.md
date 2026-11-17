# Web App UX visual and interaction QA checklist

Use with `kidsfit-crm-frontend-design/references/ui-review-checklist.md`. A code change must be tested against the **exact commit and relevant route/role**; documentation alone is not visual evidence.

## Test log format

Record for each UI change: branch/commit, route and role, device/browser, CSS viewport, DPR or zoom, theme, authentication/data mode, screenshot before/after path if captured, and result **PASS / FAIL / NOT TESTED / BLOCKED**. Never attach invented screenshots or assume a static reference equals a rendered browser result.

## Navigation and shell

- [ ] At 1024px+: Sidebar expanded 248px and collapsed 72px both remain visible; Header control toggles them; content offset follows; preference survives reload.
- [ ] Below 1024px: existing bottom navigation is available and readable; active destination and keyboard focus work.
- [ ] Global search, theme, notifications and profile remain reachable; long Vietnamese headings do not collide with actions.
- [ ] Browser back/forward and deep-link navigation retain correct role/route and do not bypass authorization.

## Responsive and density

- [ ] Inspect **320, 375, 390, 768, 1024, 1440px** plus 200% zoom and landscape; note actual viewport/browser when possible.
- [ ] No page-wide horizontal scrolling; narrow tables scroll inside the table panel or follow an approved record-card layout.
- [ ] Filters/toolbar wrap without losing Search, Reset, Refresh, status, date or pagination.
- [ ] Cards/charts and currency/date values remain meaningful, legible and correctly sourced.

## Touch, keyboard and overlays

- [ ] Essential targets approximately 44 × 44 CSS px where practical; touch doesn't depend on hover.
- [ ] Keyboard Tab, Shift+Tab, Enter, Space, Escape and visible focus work; icon-only controls have accessible names.
- [ ] Drawer/Sheet/Dialog opens and closes accessibly; overlay scroll/body lock/focus trap/return work.
- [ ] With virtual keyboard shown, fields and submit remain reachable; footer doesn't overlap bottom nav or safe-area.
- [ ] Accessibility at text scaling/200% zoom; reduced-motion setting prevents unnecessary animation.

## States and trust

- [ ] Distinguish skeleton, scoped spinner, retryable error, empty/no-match, forbidden, busy, success and partial data failure.
- [ ] Refresh does not reset filters, repeated clicks do not duplicate high-impact mutation, and financial state is server-confirmed.
- [ ] Light/Dark color contrast, status text+icon, toast placement and scrollbar discoverability are usable.
- [ ] No fake data, secret exposure, unauthorized role values or hidden required information.

## Tooling and reporting

From `frontend/`, when modifying runnable UI code:
```powershell
npm ci
npm run lint
npx tsc --noEmit
npm run test:unit
npm run test:pages
npm run build
```
Use a real browser for visual/interaction QA. If browser/Backend is unavailable, explicitly mark **NOT TESTED/BLOCKED** instead of claiming success. For a documentation-only skill change, validate Markdown links/path names and scope; frontend runtime checks are optional and must not be reported as run if they were not.
