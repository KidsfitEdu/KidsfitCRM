# KidsfitCRM — Document index

> **Current business baseline (2026-10-30):** [requirements/CRM_FUNCTIONAL_SPECIFICATION.md](requirements/CRM_FUNCTIONAL_SPECIFICATION.md).
> These requirements describe intended product behavior; they do **not** certify that code is implemented.
> Approved product decisions take precedence over historical implementation notes; unresolved rules remain OPEN.

## Read by task

| Task | Read first | Follow with |
| --- | --- | --- |
| Roles / organization / authorization | [Roles and permissions](requirements/ROLES_AND_PERMISSIONS.md) | [Codebase gaps](requirements/CODEBASE_GAP_ANALYSIS.md), source and tests |
| Sales registration, allocations, proposals | [Workflows](requirements/BUSINESS_WORKFLOWS.md) | [Rules](requirements/BUSINESS_RULES.md), school directory skill reference |
| Extension, limits, conflicts, departure | [Rules](requirements/BUSINESS_RULES.md) | [Workflows](requirements/BUSINESS_WORKFLOWS.md), regression tests |
| Contract verification, CHECKEE, finance | [Functional spec](requirements/CRM_FUNCTIONAL_SPECIFICATION.md) | [Workflows](requirements/BUSINESS_WORKFLOWS.md), [decisions](requirements/DECISION_LOG.md) |
| What is currently implemented? | [Codebase gaps](requirements/CODEBASE_GAP_ANALYSIS.md) | [Implementation records](implementation/), code and tests |
| Frontend design / responsive / UI review | [KIDSFIT design system](design/FRONTEND_DESIGN_SYSTEM.md) | [Frontend skill](../.agents/skills/kidsfit-crm-frontend-design/SKILL.md), current components and screenshots |
| Engineering conventions | [Repository AGENTS](../AGENTS.md) | [Skill](../.agents/skills/kidsfit-crm-development/SKILL.md) |
| Testing, demo and operations | [Testing](testing/CRM_SYNTHETIC_SEED_SCENARIOS.md) | [Demo deployment](operations/DEMO_DEPLOYMENT.md) |

## Document authority

1. Latest explicit approved product decisions recorded in [Decision Log](requirements/DECISION_LOG.md).
2. [Functional specification](requirements/CRM_FUNCTIONAL_SPECIFICATION.md), [business rules](requirements/BUSINESS_RULES.md), [workflows](requirements/BUSINESS_WORKFLOWS.md), and [roles](requirements/ROLES_AND_PERMISSIONS.md) as the current intended business baseline.
3. Existing code, migrations and tests describe **current behavior**, not automatic product approval. See [gap analysis](requirements/CODEBASE_GAP_ANALYSIS.md).
4. Legacy implementation documents in `implementation/` and references in `.agents/` supply historical/technical context. Their old policy examples must not override current approved decisions.

For new or modified features, inspect the latest code and tests; do not assert a feature is shipped without verification. Update the gap analysis/implementation notes with evidence and never migrate or delete legacy role/financial/audit records merely to match current display labels.

The GitHub repository does **not** include real school source files or personal/contract evidence. The project-local Excel template mentioned in legacy docs may require an externally supplied copy.
