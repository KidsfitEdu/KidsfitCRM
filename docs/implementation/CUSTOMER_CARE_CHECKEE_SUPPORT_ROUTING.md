# CSKH → CHECKEE support-ticket workflow (approved 2026-11-03)

## Scope and ownership

- CSKH creates and owns every customer-support case for the **assigned** active and verified contract.
- `USAGE_GUIDANCE`: CSKH handles directly. CHECKEE cannot read or update the case.
- `SYSTEM_ERROR`: CSKH logs and automatically routes to the active `CHECKEE` organization. CHECKEE adds technical progress and a **completed technical response**, but only CSKH closes after confirming with the school.
- Status remains `OPEN`, `IN_PROGRESS`, `RESOLVED`. CHECKEE completion is a separate timestamp; it never directly resolves the case.
- If login fails, CSKH verifies whether the cause is user guidance or software failure before selecting the ticket category.
- CSKH assignment follows `sales_contracts.care_user_id`; transfer of open tickets follows existing `AssignContractCare` workflow. The latest assigned handover can be accepted or marked `NEEDS_INFO`. Previous records stay intact.
- No pricing, SLA, priority, external notifications, attachments/storage or new infrastructure in this scope.

## API contracts

All paths are under `/api/channel-sales`.

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/customer-support-cases` | `SchoolSupportManage`; accepts optional `ticket_type` (new clients should send it) |
| POST | `/customer-support-cases/{id}/progress` | `SchoolSupportManage`; only assigned CSKH may close |
| GET | `/checkee/support-cases` | `SchoolTechnicalSupportHandle` + active CHECKEE organization membership |
| POST | `/checkee/support-cases/{id}/progress` | `SchoolTechnicalSupportHandle` + exact routed organization |
| POST | `/contracts/{id}/care-handover/respond` | `SchoolSupportManage` + current assignee |

CHECKEE list contains school name, ticket description, contract code and CHECKEE technical update history, **not** contact phone/email or commissions. CHECKEE response body: `{ "content": "...", "completed": true|false }`.

## Deployment / data safety

- Apply additive EF Core migration `20261103110000_CustomerCareSupportRouting` in a prepared test environment first. Existing tickets are backfilled as `USAGE_GUIDANCE` to avoid leaking historical requests to CHECKEE; reassess historical error tickets manually.
- Provision the new permission `channel_sales.school.technical_support.handle` to the CHECKEE role via controlled application RBAC provisioning; demo seeder includes it but the seeder is **not** a production RBAC migration.
- CHECKEE organization `Code=CHECKEE` must exist and be active to create a system-error ticket. The application fails closed when missing.
- No database migration or synthetic seed should run against production from the app without backup and explicit release approval.
- Full .NET/MySQL integration and UI tests must pass before merge. This repository change alone does not assert live database state.
