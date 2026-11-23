# KIDSFIT CRM — documentation index

> **Source snapshot:** `develop` at `4e9c99db374c082289608c60573a7894ee375834` (2026-11-21). Always verify the current HEAD. Product requirements describe **intent**; code/migrations describe **implementation**; only executed tests and observed behavior constitute **verification**.

## Authority and precedence
1. Current explicit user-approved scope and [Decision Log](requirements/DECISION_LOG.md) (D-17 and D-18 supersede historical 30% Sales-only policies).
2. [Functional specification](requirements/CRM_FUNCTIONAL_SPECIFICATION.md), [business rules](requirements/BUSINESS_RULES.md), [workflows](requirements/BUSINESS_WORKFLOWS.md) and [roles](requirements/ROLES_AND_PERMISSIONS.md) for intended product behavior.
3. Actual live code, migrations, API contracts and test evidence for current runtime behavior, compared in [gap analysis](requirements/CODEBASE_GAP_ANALYSIS.md).
4. Prior implementation notes and skill examples as **historical** context only when current source supersedes them. Never invent a decision for OPEN items.

## Read by task
| Task | Primary | Follow-up |
| --- | --- | --- |
| Feature state / source paths | [Source map](implementation/CURRENT_SOURCE_MAP.md) | [Feature status matrix](implementation/FEATURE_STATUS_MATRIX.md), [gap analysis](requirements/CODEBASE_GAP_ANALYSIS.md) |
| Architecture / implementation | [Repository engineering skill](../.agents/skills/kidsfit-crm-dev/SKILL.md) | [Frontend architecture](../frontend/docs/architecture.md), [API contracts](architecture/API_CONTRACTS.md) |
| Roles / security / organization | [Roles and permissions](requirements/ROLES_AND_PERMISSIONS.md) | [Decision log](requirements/DECISION_LOG.md), backend source |
| Sales, school, allocation | [Workflows](requirements/BUSINESS_WORKFLOWS.md) | [Rules](requirements/BUSINESS_RULES.md), school feature endpoints |
| CHECKEE, renewals, commissions, payout | [Decision log](requirements/DECISION_LOG.md) | [Finance domain skill](../.agents/skills/kidsfit-crm-development/SKILL.md), relevant endpoints |
| Auth / password / API JSON | [API contracts](architecture/API_CONTRACTS.md) | `AuthFeatures.cs`, `api.client.ts`, tests |
| Release / production safety | [Production readiness](operations/PRODUCTION_READINESS.md) | [Database verification](operations/DB_VERIFICATION.md), [seven-role UAT](operations/SEVEN_ROLE_UAT.md) |
| Database / migration / startup | [Source map](implementation/CURRENT_SOURCE_MAP.md) | [Backend README](../backend/README.md), [DB safety](implementation/PHASE_1_DB_SAFETY.md) |
| UI and responsive | [Design system](design/FRONTEND_DESIGN_SYSTEM.md) | [Frontend design skill](../.agents/skills/kidsfit-crm-frontend-design/SKILL.md), [Webapp UX](../.agents/skills/kidsfit-crm-webapp-ux/SKILL.md) |
| Testing / synthetic data | [Feature status matrix](implementation/FEATURE_STATUS_MATRIX.md) | [Test fixtures provenance](testing/CRM_SYNTHETIC_SEED_SCENARIOS.md), CI workflows |

## Documentation maintenance requirements
- Each significant source change updates relevant docs/skills in the **same PR**; refresh source SHA, paths, business decisions, API request/response conventions, migration notes and tests.
- Mark each feature/claim as `CONFIRMED` (approved decision), `OPEN` (not approved), `IMPLEMENTED` (source exists), or `VERIFIED` (tested at stated SHA). These are **different dimensions**.
- Obsolete files/sections may be rewritten, merged or removed after backlink/dependency checks; do not delete approved decisions, migration provenance, security/audit requirements or real data.
- No real school imports, passwords, JWTs, partner/customer PII or contract evidence should appear in repository documentation or examples. Repository skills are instruction files, not automatically installed plugins.
