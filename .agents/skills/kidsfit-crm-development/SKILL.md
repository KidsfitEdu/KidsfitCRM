---
name: kidsfit-crm-development
description: Backward-compatible entrypoint for KidsfitCRM school-sales and education-center domain references: CHECKEE, school directory/import, capacity, extensions, contracts, renewal, finance, and EF/MySQL conventions. For implementation workflows use the primary kidsfit-crm-dev skill.
---

# KidsfitCRM Development — domain reference index (compatibility)

**The authoritative full-stack process is [kidsfit-crm-dev](../kidsfit-crm-dev/SKILL.md).** This existing skill name remains discoverable for earlier links and prompts, but should not be invoked as a second conflicting engineering workflow. The original domain references are preserved; no runtime code or business rules are changed by this documentation consolidation.

## Required source checks

1. Verify current `develop` HEAD, relevant PR, [AGENTS.md](../../../AGENTS.md), [Decision Log](../../../docs/requirements/DECISION_LOG.md), [Source Map](../../../docs/implementation/CURRENT_SOURCE_MAP.md), and affected code/tests. Dates inside examples are snapshots, not implementation evidence.
2. Distinguish approved **school-sales CRM** from historical **education-center CRM** (guardian/student, enrollment/trial/course). Never apply similarly named status, entity or approval to the wrong bounded context.
3. Current approved intent includes seven business roles (legacy technical names remain), default 10 concurrent schools, 5-day claim and up to three approved 7-day extensions; School Proposal → Manager → Admin; School Contract → Manager → CHECKEE → separately authorized KIDSFIT 5-year grant. D-12/D-13/D-14 are OPEN. Follow D-17/D-18 (25% Sales + 5% Manager defaults, eligible cash, shared payout approval), preserve historical 30% entries. Confirm code behavior rather than assuming intent shipped.
4. No direct DB mutation, demo seed, irreversible financial operation or unapproved PR/merge from this skill.

## Choose only the relevant reference

- [CHECKEE, Sales, protection, revenue, commission and payouts](references/checkee-sales-crm.md)
- [School directory, import, branch, proposal, allocation and extension](references/school-directory-workflows.md)
- [Domain boundaries, ownership, invariants and workflows](references/domain-workflows.md)
- [Engineering conventions for the legacy domain](references/engineering-conventions.md) — use primary dev for the actual implementation workflow
- [MySQL conventions and migration constraints](references/mysql-conventions.md) — supplement primary [MySQL & Migrations](../kidsfit-crm-dev/references/mysql-and-migrations.md)
- [Notifications and workflow inbox](../kidsfit-crm-dev/references/notifications-and-events.md)
- [Testing and regression](../kidsfit-crm-dev/references/testing-and-regression.md)

For UI appearance use [Frontend Design](../kidsfit-crm-frontend-design/SKILL.md); for mobile/touch/overlay behavior use [Webapp UX](../kidsfit-crm-webapp-ux/SKILL.md). For a broad approved multi-module effort use [One-shot](../kidsfit-crm-one-shot-implementation/SKILL.md). Follow the primary skill's approval and exact-SHA verification gates.
