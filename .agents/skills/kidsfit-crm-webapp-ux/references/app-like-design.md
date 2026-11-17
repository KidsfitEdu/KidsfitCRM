# App-like visual language — KIDSFIT CRM

This reference complements `kidsfit-crm-frontend-design/references/design-system.md`. The existing KIDSFIT tokens, component hierarchy and screenshots remain the source of truth for **appearance**; this file describes an efficient, app-like **experience** in the browser.

## Design intent

Make common tasks feel focused and predictable without pretending this is a native app. CRM users frequently review school details, assign responsibility, approve proposals, follow up on contracts and process finance. Prioritize clarity and confidence over animation or decorative effects.

- **Structure:** consistent persistent chrome (Sidebar / Header on desktop, existing bottom navigation on smaller screens); content flows page heading → purpose/action → filters → records → details/feedback. Preserve users' location when they return from a Drawer.
- **Hierarchy:** one prominent page title and primary action; use existing `AppPageHeader` and semantic tokens. Group related fields into restrained white/card surfaces, avoid nested cards for every label or gratuitous gradients.
- **Visual rhythm:** use spacing and typography tokens from the existing frontend design skill. Favor aligned baselines, visible whitespace around decisions and compact density in long operational lists.
- **Brand:** deep green navigation, KIDSFIT primary green, light neutral content, semantic amber/blue/red as already defined. Never hardcode a fresh color palette per view or make all icons bright.
- **Typography:** legible Vietnamese diacritics; financial amounts, date/time and IDs are scannable and keep their meaning. Use tabular numerals where appropriate. Do not abbreviate critical content solely to make a screenshot pretty.

## Mobile adaptation, not scaling down

| Experience | Wide screen | Narrow screen |
| --- | --- | --- |
| Overview | Balanced KPIs/charts and task panels if real data supports them | Meaning-first stacked cards; readable totals and one useful next step |
| Search/list | Toolbar beside a table with scoped horizontal scrolling | Toolbar wraps/stacks; table scroll is contained or an explicitly reviewed record-card alternative |
| Details | Shared right-side Drawer with anchored actions | Nearly/full-width overlay; internal scroll and reachable close/action buttons |
| Form | Paired fields only if legible | Single column, persistent labels, readable inline validation and keyboard-safe footer |
| Row actions | Semantic icon buttons with tooltip/accessible name | Keep essential actions reachable and touch-friendly; avoid icon overflow |

Never convert a real server-filtered data table into static cards by copying fake values. Preserve row identity, pagination, visibility and permissions.

## Polish and anti-patterns

- Use consistent hover, pressed, selected, busy and disabled styles across the same action kind.
- Keep screen transitions understated; never delay navigation waiting on decorative animation.
- Do not add a splash mascot, unrelated charts, 3D effects, excessive shadows or a second component library to create a “premium” look.
- Buttons must perform their named operation; avoid nonfunctional “refresh” or “see more” decorations.
- Use meaningful empty states that explain why the list is empty or filters exclude all records and show a valid recovery action.
- Do not claim that a reference image has been matched until an actual browser comparison was performed.
