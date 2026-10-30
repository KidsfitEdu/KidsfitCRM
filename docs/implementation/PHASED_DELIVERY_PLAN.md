# KidsfitCRM — phased delivery plan for coding agent

**Version 2, 2026-10-30.** Source baseline `develop` commit `0b30cbf28397a453628aedabf863ebb3a101cd6a`. For **execution**, re-check current HEAD, branches, code, DB and tests. This plan does **not** authorize production writes. Business authority: `docs/requirements/`; runnable prompt: [Master Prompt v2](../prompts/MASTER_CRM_IMPLEMENTATION_PROMPT.md).

## Safety gates

- Preserve working code, role IDs, legacy navigation, old CRM education contexts, financial and audit history, customer ownership and all applied migrations. Only additive/backward-compatible changes unless separately approved.
- Test/seed/dump/migrate strictly on independent local/test MySQL. `start-local.ps1` has side effects (provisions credentials and automatically `--migrate --seed-demo`), `compose.yaml` launches migration and demo config. Both require connection inspection; neither is read-only.
- On a business policy marked OPEN, do not choose an arbitrary number/role/finance rule. Stop the affected action and continue safe independent tasks. Store exact tests, not assumed PASS.
- Work on separate branch from `develop`; PR review required; no self-merge.

## Phase gates

| Phase | Source-specific work | Evidence and exit |
| --- | --- | --- |
| 0. Audit | Read both skills, docs, `src/` map, tests, migration history and live HEAD | Requirement→file/API/schema/UI/test matrix, baseline commands + actual status |
| 1. DB | EF Core/MySQL 8.4 inventory, compatibility role map, additive migration, test data backup/restore if writes | No destructive migration; schema/data invariants and isolated DB results |
| 2. Sales RBAC | Repair `SchoolActions.IsCollaborator` quota bypass for Sales; preserve `DatabaseSeeder` legacy codes | Quota 10 for employee and CTV, Admin override, org/concurrency regression |
| 3. School workflows | Reuse `SchoolProposalActions` manager-first flow; `SchoolAllocationActions` policy 5+7×3 | Proposals, extensions count/boundary, owner races and audit |
| 4. Contracts | Manager KIDSFIT/partner CHECKEE submission; existing review, reconciliation, grant | Valid verification before grant; grant actor OPEN and guarded |
| 5. Finance/CSKH | Receipts, payout ledger, refunds, handover | Decimal accounting, idempotency, data scopes, no 30% activation |
| 6. Frontend | Vinext `frontend/src/`, maintain SalesStaff/Collaborator compatibility while introducing shared Sales UX | Lint/TS/build/demo/pages tests, browser responsive QA if actually run |
| 7. Data | Reuse `DatabaseSeeder` and `CrmScenarioSeeder`; separate seed from mysqldump/restore | Seed idempotent, independent restore verified or marked NOT_RUN |
| 8. Regression | Backend/MySQL/frontend/browser, tenant/finance/legacy CRM | Actual PASS/FAIL/SKIPPED/NOT_RUN/BLOCKED and fixes |
| 9. Handoff | Update gap/docs/skills as needed, commit and PR by bounded stage | Exact changed files, no lost code/data, documented approvals and blocker list |

**Verification commands:** `dotnet test backend/KidsfitCRM.slnx`; `backend/test-mysql.ps1` after verifying `KIDSFIT_TEST_MYSQL_ADMIN` points only to disposable MySQL; from `frontend/`, `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run test:demo`, `npm run build`, `npm run build:pages`, `npm run test:pages`. Browser smoke via `.github/workflows/frontend-refactor.yml`, only claim visually tested if rendered.

## Unresolved policy fences

- KIDSFIT post-CHECKEE `SchoolProtectionGrant` actor **OPEN**; Admin/Director are not routine contract reviewer. No unilateral delegation or auto-grant.
- Sales 30% commission **PROVISIONAL**; money base, accrual trigger, payout and refunds **OPEN**.
- Pending extension review protection/SLA, main school/branch scope, and certain cancellation/reconciliation outcomes **OPEN**.
- No referrer/personal split. Maintain confirmed 7 roles, Sales capacity 10, initial 5 days + 7 days up to 3 approvals.

## Reporting contract

Use the report template in [Master Prompt](../prompts/MASTER_CRM_IMPLEMENTATION_PROMPT.md) after **every** phase, including `REUSED/PRESERVED`, data impact, actual tests, unresolved policy and commit/PR. Failing a safety gate must not be hidden by broad success claims.
