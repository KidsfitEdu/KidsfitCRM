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
- [ ] Inspect final TSX/JSX closing tags and imports; run actual supported commands from `frontend/`: `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run test:pages`, `npm run build` (do not assume `test:demo` exists).

## Cross-component and screenshot regression

- [ ] List *all* consumers of each edited shared component (including other roles); verify their open/close, accessible controls, loading and error paths.
- [ ] For dialogs, image previews and popovers: check fixed positioning, viewport centering, background scroll lock, focus return, Escape/outside close, overflow, image aspect ratio, PDF fallback and blob URL lifecycle.
- [ ] For searchable selects: type multiple characters without focus loss; test keyboard navigation, portal z-index, long lists and mobile viewport overflow.
- [ ] For menu or route consolidation: verify old deep links, Back/Forward, state and permission behavior, not only sidebar visibility.
- [ ] For dashboard KPIs/charts: name source and data semantics (snapshot/as-of vs period), timezone, totals, refund treatment, tenant scope, pagination independence and honest empty/loading/forbidden behavior.
- [ ] Compare actual rendered screenshots at 375/768/1024/1440px, dark mode and 200% zoom, or explicitly mark browser visual QA NOT RUN.

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
- [ ] Verify the latest commit SHA's actual lint/tsc/unit/pages/build/MySQL results; **do not reuse old green CI**. If any check fails or is pending, PR remains Draft and handoff lists blockers.
- [ ] Compare failing tests against base branch HEAD before calling them pre-existing. Update approved obsolete assertions and preserve unrelated failure reports.
- [ ] If a screenshot is cited as parity, an actual rendered UI at this SHA was inspected; otherwise mark visual QA `NOT RUN`.
- [ ] Explicitly distinguish business `OPEN` policies, source gaps and decisions confirmed only in a historical chat.
- [ ] Clearly state whether project instructions were actually installed, repo changed, PR created/merged, or only local artifacts created.