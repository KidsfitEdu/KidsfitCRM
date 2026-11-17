# Mobile forms, Drawer, Modal and the virtual keyboard

Treat forms and overlays as **one continuous task**, not a separate decorative layout. Reuse `frontend/src/components/common/drawers/app-drawer.tsx`, existing Dialog/Sheet primitives, form components and `AppButton` before proposing new abstractions.

## Shared Drawer/Sheet contract

- Desktop: right-side Drawer appropriate to content width (often about 480–560px, sometimes wider), KIDSFIT header and clear close icon, scannable summary, grouped information, readable empty values and fixed/reachable footer.
- Mobile: nearly/full-screen width, no horizontal overflow, body scrolls independently; header, close and essential actions stay usable. Never cut off long contract IDs, school names, status or monetary values.
- Closing by button/Escape/backdrop must obey existing busy and confirmation rules; do not let a dismissal silently discard unsaved data. Ensure focus trap and focus return according to the shared primitive.
- Avoid duplicate `overflow-y-auto` descendants that capture scrolling unexpectedly. Test `h-dvh`, bottom navigation, safe-area and keyboard.

## Form layout

- One column on narrow screens; use two columns only when each Input/Select label and error remain readable.
- Labels are persistent and associated to fields; placeholders are not labels. Required markers, localized help and `aria-describedby` error associations must be consistent.
- Date pickers, selects, searchable comboboxes and popovers must fit the viewport and not be clipped by Drawer scroll containers. Use portal/layer behavior provided by existing primitives.
- Buttons follow meaningful order: secondary Cancel/back before primary green Submit. Disable duplicate submission while pending, preserve entered fields on failed requests and confirm only meaningful high-impact operations.
- Input types, autocomplete and numeric formatting should match the data being entered; never format a value so aggressively during typing that the caret becomes unusable.

## Virtual keyboard and safe-area review

- At 320/375/390px, focus the lowest form field and open the on-screen keyboard: the field, validation text and Submit must be accessible by scrolling, not trapped below an anchored footer.
- Use dynamic viewport sizing and a scrollable content region when appropriate. Do not rely on one hard-coded full-screen height across Safari/Chrome and device rotations.
- Keep close/Cancel reachable if the form has an error; don't layer the bottom navigation over an active modal footer.
- On dismissal, restore the originating screen/filters/scroll position when feasible; don't replace whole pages just to update one record.
- Ensure loading, empty, error, forbidden and completed states in overlays are distinct and do not disclose unauthorized data.
