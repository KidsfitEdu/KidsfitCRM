# Definition of done and quality gates

## Before editing

- [ ] Branch and commit HEAD verified; no accidental override of uncommitted user work.
- [ ] Identified feature scope, roles, permissions, data ownership, relevant UC/BR/TC and OPEN policy.
- [ ] Searched existing components/actions/DTOs/tests and selected reuse strategy.
- [ ] Identified migration, side effects and compatibility risks.

## Frontend

- [ ] Shared KIDSFIT tokens/components/layout reused; no parallel UI system.
- [ ] Typed API response/errors, loading/empty/error/forbidden/disabled states.
- [ ] Search/filter/reset/refresh/pagination wired; forms validated; appropriate focus/a11y.
- [ ] Responsive 375/768/1024/1440, dark mode, no offscreen dialogs or page overflow.
- [ ] Real UI rendered and compared when claiming screenshot parity.
- [ ] Actual commands as supported: `npm run lint`, `npx tsc --noEmit`, `npm run build`, relevant `npm run test:demo` / `npm run test:pages`.

## Backend/database

- [ ] Backend role + tenant/organization scope and object ownership enforced for every read/write.
- [ ] Correct DTO validation, HTTP errors, server-side status transition guards.
- [ ] Transaction/audit same consistency boundary; side effects dispatched post commit.
- [ ] Duplicate claim prevented under simultaneous requests; tested not just UI checked.
- [ ] Payments idempotent; money exact; refund adjustments append-only; audit preserved.
- [ ] Additive MySQL 8.4 migration tested with existing records in isolated DB; no unauthorized seed or prod changes.
- [ ] Actual commands as supported: `dotnet test backend/KidsfitCRM.slnx`; isolated `backend/test-mysql.ps1` with `KIDSFIT_TEST_MYSQL_ADMIN` configured appropriately.

## Final report template

- Scope/requirement IDs:
- Branch / commit (actual or proposed):
- Changed files (exact paths):
- Behavior/compatibility:
- Database migration/backfill/backup:
- Tests: PASS / FAIL / SKIPPED / NOT RUN with reasons:
- Open policy blockers / risk:
- PR URL (only if actually created):

Never summarize skipped or unrun tests as successful. Green lint/build alone does not prove browser parity, RBAC, real MySQL locking or production readiness.

## Git/CI handoff — additional gates

- [ ] Confirm the PR is still open; if merged, use a new approved branch rather than pushing to the old one.
- [ ] Review commit granularity: meaningful, separately reviewable units; no repeatedly force-pushed single SHA.
- [ ] Verify latest commit SHA has green lint/tsc/tests/build and scoped MySQL checks; **do not reuse old green CI**.
- [ ] If a screenshot is cited as parity, an actual rendered UI at this SHA was inspected; otherwise mark visual QA `NOT RUN`.
- [ ] Explicitly distinguish business `OPEN` policies, source gaps and decisions confirmed only in a historical chat.
- [ ] Clearly state whether project instructions were actually installed, repo changed, PR created/merged, or only local artifacts created.