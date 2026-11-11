---
name: kidsfit-crm-dev
description: Professional full-stack development, requirements review, code review, testing, Git and UI/UX for KidsfitEdu/KidsfitCRM using React 19, TypeScript, Vinext, Tailwind 4, ASP.NET Core .NET 10, EF Core 10 and MySQL 8.4. Apply to KIDSFIT/CHECKEE CRM implementation, UX, sales, schools, contracts, renewals KC-02, GI-01, finance, authorization, CI and PRs.
---

# KIDSFIT CRM Dev — Engineering Skill

**Purpose:** deliver safe, reviewable, professional code changes for `KidsfitEdu/KidsfitCRM` in Vietnamese, without confusing proposed business policy, live code and historical handoff documents. This skill is a portable guide; **it does not install itself, change project instructions, connect GitHub or commit anything by itself**.

## 0. Source-of-truth and task authorization

1. **Read the explicit request first.** If the user says **“xác nhận trước khi code”**, research, identify change files and tests, provide the proposed scope, then **STOP**. No code, commit, branch or PR until approval. If the user subsequently says “chốt triển khai”, execute the approved scope; Git write actions must be in the previously approved scope or explicitly requested.
2. **Verify live `develop` HEAD** and the relevant existing PR/branch before every implementation. Don't treat repository default branch or old SHA as current. If an unmerged PR exists for the same slice, continue on it only if safe; do not duplicate its work.
3. Read `AGENTS.md` (including special one-shot overrides), `docs/README.md`, `docs/requirements/DECISION_LOG.md`, task-relevant requirements, `docs/requirements/CODEBASE_GAP_ANALYSIS.md`, `docs/implementation/CURRENT_SOURCE_MAP.md`, then actual files/tests/schema. Also read `.agents/skills/kidsfit-crm-development/SKILL.md`, `.agents/skills/kidsfit-crm-frontend-design/SKILL.md` and specific references as appropriate.
4. **Conflict order:** user-approved current scope and business decisions > current approved `DECISION_LOG.md`/specific requirement decisions > authoritative schema/code/tests for *current implemented behavior* > historical notes and skill snapshots. When policy and implementation differ, **report the gap**, never silently rewrite or invent a rule. `CONFIRMED`, `OPEN`, `PROPOSED` must remain distinguishable.
5. Treat document dates and version names as snapshots, not claims that everything has shipped. This skill was refreshed against `develop` on **2026-11-11**; reverify before acting.

## 1. Minimal, evidence-driven workflow

**Request → Scope → Inspect → Plan → Implement → Verify → Git/PR → Handoff.**

- **Scope**: actor, organization scope, UC/BR, UI screens, exact expected behavior, old-data compatibility and explicit exclusions. Identify whether task is **analysis only**, **code only**, **code + commit**, or **code + PR**.
- **Inspect**: actual Frontend/Backend/DbContext/tests, shared components, permissions, current feature flags/seed, CI workflows, pending PRs and requirements conflicts. Use GitHub connector for repository reads when connected; never guess a file path or pretend a checkout ran.
- **Plan**: list targeted files, contracts/DTOs, migrations, expected table and Drawer content, status mapping, error/loading states, risk and tests. Prefer the smallest coherent change, not an opportunistic refactor.
- **Implement**: honor ownership boundaries, reuse existing components/actions/services, preserve finance and audit records, and align UI with server authority.
- **Verify**: checks must be run *on the exact commit or working state being reported*. Record `PASS`, `FAIL`, `NOT RUN`, `BLOCKED` honestly. No generic “CI passed” if only earlier SHA passed.
- **Git**: use distinct purposeful Conventional Commits for independently reviewable units. **Do not force a single commit** and **do not produce dozens of tiny fixes**. After a commit is pushed, never rewrite it or force-push without explicit approval. See [Git & Delivery](references/git-and-delivery.md).
- **Handoff**: state exactly what was changed, where, branch/SHA/PR, tests and any unresolved risks. Never claim production deployment or visual QA without actual verification.

## 2. Engineering boundaries

- **Frontend**: React 19, TypeScript, Vinext, Tailwind 4, shadcn/ui, Lucide. Real source is `frontend/src/app`, `frontend/src/screens`, `frontend/src/components/common`, `frontend/src/components/ui`, `frontend/src/services`, `frontend/src/config`. Reuse design tokens and shared primitives before creating new ones; no parallel app/component roots. See [Frontend & Design](references/frontend-and-design.md).
- **Backend**: ASP.NET Core .NET 10 modular monolith; thin endpoints, named actions, validated DTOs, transaction-aware domain changes, centralized RBAC and tenant/school record scoping. Do not infer a user's permission from a visible button. See [Backend & API](references/backend-and-api.md).
- **Database**: MySQL 8.4 LTS, InnoDB/utf8mb4, EF Core 10 and existing MySQL provider. Exact VND money; concurrency and idempotency for claims, receipts and payouts; additive migrations; isolated MySQL integration. No destructive DB/seed/dump operations without separate safe authorization. See [MySQL](references/mysql-and-migrations.md).
- **Business**: seven target roles (legacy technical roles may remain), Sales capacity default 10, 5-day approach and 7-day × up-to-3 approved extensions, proposal via Manager→Admin, CHECKEE contract verification, 5-year protection and separately confirmed annual renewal workflows. **30% commission rate CONFIRMED; base/trigger/tax/payout terms OPEN.** Do not invent finance rules. See [Business Rules](references/business-rules.md) and [KC-02 / GI-01](references/kc02-gi01-accounting.md).
- **Security**: restrict data to authorized organization and record, no PII or finance data in unscoped output, no secrets in Git, read-only review before hazardous operations. See [Security & Audit](references/security-and-audit.md).

## 3. Task-based reference routing

| Task | Read |
|---|---|
| Architecture, files or refactor | [Architecture & Reuse](references/architecture-and-reuse.md), [Backend & API](references/backend-and-api.md) |
| Screenshot, design, shared UI, badges | [Frontend & Design](references/frontend-and-design.md), repo frontend-design skill, [Quality Checklist](references/quality-checklist.md) |
| Contract, renewal, GI-01, Sales protection, Accounting | [Business Rules](references/business-rules.md), [KC-02 / GI-01](references/kc02-gi01-accounting.md), repo CHECKEE reference |
| Schema, migration, locking, seed | [MySQL](references/mysql-and-migrations.md), repo `mysql-conventions.md`, [Security & Audit](references/security-and-audit.md) |
| Branch, commit, PR, CI and deployment | [Git & Delivery](references/git-and-delivery.md), [Quality Checklist](references/quality-checklist.md), [AI Workflow](references/ai-workflow.md) |
| Code review / bug / test | [Quality Checklist](references/quality-checklist.md), nearby tests and affected domain reference |

If a reference is not installed next to this skill, follow the rules available and disclose what could not be inspected. Do not fake availability.

## 4. UI standards relevant to Accounting

- KIDSFIT green foundation with semantic highlight colors, **status = current condition** and **Cần xử lý = actual accounting task**. Color plus text/icon, not color alone; light/dark readable.
- Current unified Accounting workspace is a single 8-column base-contract list: Nhà trường, Sales phụ trách, Kỳ sử dụng, Dịch vụ, Cần xử lý, Thanh toán, Hoa hồng, Thao tác. No school code in list; keep contract ID in detail as needed. Single contract Drawer for renewal/finance/GI-01 history. **Treat this as the 2026-11-11 code baseline, not a universal permanent policy.**
- Financial labels: **Giá trị hợp đồng**, **Thực thu** (net of refunds in current projection), **Hoa hồng ghi nhận** (not automatically paid). Put label above amount in a table cell; do not add cards unless requested.
- GI-01 display: Đang sử dụng / Sắp hết hạn / Gián đoạn / Đủ 12 tháng / Quá 12 tháng / Đã hết bảo vệ / Cần rà soát. Releasing protection requires an actual permitted backend decision, **not** a mere time threshold.
- Screenshot comparisons require inspecting an actual rendered screen; CI compilation is not visual equivalence. Do not apply accounting-specific style globally to other roles without checking consumers.

## 5. Delivery contract

Always distinguish **proposed** from **executed**. End with: scope and files; exact commit(s), branch and PR (if created); tests table with state and exact HEAD; DB/migration impact; unverified visual/production behavior; open policy questions. Do not merge/deploy without explicit authorization. See [Quality Checklist](references/quality-checklist.md) and [Examples](references/examples.md).