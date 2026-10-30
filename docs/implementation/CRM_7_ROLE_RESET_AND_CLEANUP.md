# CRM 7-role reset & cleanup — tracked implementation gate (2026-10-30)

**Scope approved:** owner confirmed current local MySQL contains **demo data only** and is disposable. Refactor source to the seven business roles defined in `docs/requirements/DECISION_LOG.md`, retire unrelated enrollment/tuition code and create a clean CRM-only initial schema. Keep PR #25 open; do not merge.

**What is verified:** repository source, migrations and GitHub CI. **What is not verified:** a reachable MySQL local database, a restorable local dump, a fully rebuilt EF schema or a successful seven-role login matrix. The coding environment has no dotnet SDK, MySQL client/server or Docker. No database DROP/ALTER/DELETE has been executed.

## Mapping / deletion manifest

| Existing implementation | Target role / disposition | Pre-removal dependency |
| --- | --- | --- |
| `ADMIN`, `ACCOUNTANT`, `CHECKEE`, `SALES_MANAGER`, `SALES` | KEEP | Canonical role keys |
| `BOARD` | `DIRECTOR` | Move `role_user`, `permission_role`, membership / frontend role checks, seed and test fixtures |
| `CUSTOMER_CARE` | `CUSTOMER_SERVICE` | Handover permissions, support cases, membership and screen |
| `CHANNEL_SALES`, `PARTNER_COLLABORATOR` | `SALES` | Preserve organization/personnel type, 10-slot capacity and scoped ownership |
| `PARTNER_ADMIN` | `SALES_MANAGER` | Preserve delegated manager authority within partner organization; never grant global scope |
| `courses`, `classes`, `class_schedules`, `trial_sessions`, `enrollments` | REMOVE after replacement | `DbContext`, `LeadActions`, `ApiEndpoints`, test fixtures and seeder |
| `parents`, `students`, `parent_student`, `leads` plus associated status, source, notes and conversions | REMOVE after replacement | `LeadActions`, parent/student relationships, UI and tests |
| `invoices`, `invoice_items`, `payments` | REMOVE **legacy tuition only** | Must keep **CHECKEE finance** `revenue_receipts`, `revenue_refunds`, `commission_ledger_entries`, `payouts`, `payout_items` |
| `tasks`, `notifications` | REVIEW | Existing common workflow consumers; not safe to classify without replacement |
| `users`, permission tables, organizations, school directory, customer, contract, protections, audit, CHECKEE finance/CSKH | KEEP | Business-critical foundation and relationships |

**Important:** The screenshot of `users.code` shows user IDs, not SQL `roles.code`. Nine demo accounts can represent seven roles because Sales personnel, CTV and partner managers are separate users/organizations.

## Migration reset sequence (for disposable local demo only)

1. Make the CRM-only EF model and routes compile; create complete role grants, organization membership scope and a seven-role seed that reads `Seed__DemoPassword`.
2. Build and test the revised model on an **isolated empty MySQL 8.4** instance. Generate a replacement EF `InitialCRM` migration from the final model. Check all relationships, indexes and migration snapshot.
3. Back up the current demo database. `backend/scripts/reset-demo-database.ps1` only produces a backup; it **never drops the database**.
4. Restore that backup into a separate local database; verify integrity. Only then use a **local-only, explicit destructive reset** for the exact verified demo database name.
5. Run the new migration and seed twice (no duplicates); verify seven canonical roles, nine or more users as needed, permissions, 10 school slots, 5+7×3 extensions, CHECKEE contract lifecycle, tenant isolation, finance and CSKH.
6. Run `dotnet test backend/KidsfitCRM.slnx`, MySQL 8.4 integration, `npm run lint`, `npx tsc --noEmit`, `npm run test:demo`, Vinext/Pages builds, browser smoke and dump/restore. Update this manifest with actual results.

**Not performed yet:** replacement migration generation, migration-folder deletion, real DB reset, role remapping or full backend/frontend cleanup. A previous CI run passed 76 MySQL integration tests but failed a legacy Sales-capacity assumption; the test was updated in commit `5ec935a1` and awaits CI. Do not claim the whole refactor is complete until each gate passes.

**Business decisions still OPEN:** post-CHECKEE long-term protection grant actor, pending-extension review SLA, main/branch legal scope, and provisional 30% commission trigger/base. Do not activate them by deleting legacy schemas.
