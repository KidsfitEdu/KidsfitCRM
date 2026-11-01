# Shared UI migration — KidsfitCRM

## Scope

Source: `develop` at `657a2e29a55afae4d0d4cdb3e8fb48aaa72f2dc5`.
Branch: `refactor/shared-ui-system`.

Audit covered 98 TSX application/component files outside `components/ui` (including 56 screen files). Keep shadcn/Base UI primitives in `components/ui`; reuse the shared shells from `components/common` for application-level interactions.

## UI patterns

- `AppDialog`: short create/edit workflows and arbitrary forms, with the standard KIDSFIT header.
- `AppDrawer`: details, history, review and read-only information.
- `ConfirmDialog`: confirmation before sensitive operations.
- `AppFormDialog`: workflows with a real HTML form and external submit button.
- `AppCombobox`: searchable selections with longer option lists.
- `AppDateTimePicker`: user-editable datetime fields only where required by business workflow.
- `AppWorkNoteEditor`: notes with simple safe text formatting.

## Migrated surfaces

| Area | Before | New shell |
| --- | --- | --- |
| Admin / Personnel: create account | Native Dialog | AppDialog |
| Admin / Personnel: personnel details | Native Dialog | AppDrawer |
| Admin / Schools: add school | Native Dialog | AppDialog |
| Admin / Capacities: update limit | Native Dialog | AppDialog |
| Admin / Proposals: revision history | Native Dialog | AppDrawer |
| Admin / Proposals: review proposal | Native Dialog | AppDialog |
| Admin / Proposals: edit proposal | Native Dialog | AppDialog |
| CRM / School Directory: Excel import | Native Dialog | AppDialog |
| CRM / School Directory: school details | Native Dialog | AppDrawer |
| CRM / School Directory: capacity details | Native Dialog | AppDialog |
| CRM / School Operations: proposal details | Native Dialog | AppDrawer |
| CRM / Channel Operations: customer details | Native Dialog | AppDrawer |
| CRM / Sales: register, activity, contract, revenue | Local Dialog wrapper | Shared AppDialog via SalesFormDialog |

Existing school work logs, manager worklists, school operations history, confirmation dialogs, and school action forms already use shared components and remain unchanged in behavior.

## Intentional exclusions

- `ChannelOperations` generic financial modal receives an arbitrary ReactNode that may own a title and its own form. Replacing its shell without first defining an explicit modal descriptor could duplicate dialog titles and alter its focus/submit semantics. Retained as-is pending a separate, tested adapter.
- Inline search/filter forms, page forms, the login form and small selects are not converted into popups. Common dialog/drawer shells do not make every form a modal.
- Current native selects with small, fixed sets of options stay native. Only searchable long lists need `AppCombobox`.
- No Backend, database schema, API contract, permission or commission workflow changes.

## Acceptance checklist

- [ ] TypeScript typecheck
- [ ] ESLint
- [ ] Frontend unit tests
- [ ] Production build
- [ ] Browser test: create/edit and validation, busy and close behavior
- [ ] Browser test: drawer scroll, footer and close button on desktop/mobile
- [ ] Browser test: nested confirmation and activity history

These checks must be executed in CI or a development environment with the repo dependencies; this migration document does not assert that they passed.
