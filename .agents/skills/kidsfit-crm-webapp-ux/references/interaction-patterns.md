# Interaction, feedback and motion

Use the shared loading, error, toast and button primitives already present in the current Frontend. Do not introduce a second global notification or spinner infrastructure.

## Loading and recovery

| Situation | Preferred feedback | Important constraint |
| --- | --- | --- |
| First render of structured page | `PageLoading` / `AppSkeleton` or feature-aligned skeleton | Match content shape; avoid shifting every section into a fullscreen spinner |
| Short action (login, save, approve, submit) | Spinner in the triggering button, with busy/disabled | Prevent duplicate submits and show action text |
| Refetch/filter/pagination | Local pending state, preserving prior data when appropriate | Separate refreshing data from resetting filters |
| Slow connection/error | Contextual explanation and retry or back action | Never claim a successful mutation before server confirmation |
| No results / no permissions | Separate empty/no-match/forbidden states | An empty collection is not the same as a 403/500 error |

The shared `frontend/src/components/common/app-loading.tsx` and `app-toast-provider.tsx` should be inspected before creating a new component; exact exports can change. Use `aria-live` judiciously and avoid multiple simultaneous announcements.

## Navigation and state fidelity

- A clickable action has hover/focus/pressed/busy/disabled feedback; only attach interaction when it does something real.
- For local lists, **search/filter**, **reset filters**, **refresh data**, and **pagination** are distinct. Keep meaningful query state when opening and closing details.
- Browser back/forward, URL deep links and active navigation should remain consistent with existing Vinext routes. Do not use ad-hoc navigation that bypasses permissions.
- For destructive or financial actions, use existing confirmation patterns with the affected school/contract explicitly identified. Do not repeat an API mutation after an ambiguous network timeout without assessing idempotency.
- For editing dialogs, preserve user input on validation/network failure and return focus to the trigger on dismissal when practical.

## Micro-interactions

- Timing guidance, not mandatory defaults: subtle color/background transitions ~120–200ms; movement only for contextual state changes, not on every row/table update. Do not animate row content during a financial review.
- Support `prefers-reduced-motion: reduce`; retain all functionality without animation.
- Hover effects are enhancements; touch users need equally discoverable action labels and focus/pressed feedback.
- Avoid multiple overlay stacks and duplicate toast notifications for a single request.
- On slow networks and mobile touch, show a response immediately but don't fabricate outcomes; no fixed wait to make animation visible.

## Accessibility

- Icon-only controls require Vietnamese `aria-label`; use visible text for important destructive/approval actions where room allows.
- Keyboard: Tab/Shift+Tab, Enter/Space, Escape, focus trap/return for modal components. Status meaning must not depend on color alone.
- Aim for touch targets around 44 × 44 CSS px where practical, including row action affordances, without destroying table density on desktop.
- Validate at zoom 200%, with device keyboard, mouse and screen reader semantics; screenshots alone cannot prove interaction behavior.
