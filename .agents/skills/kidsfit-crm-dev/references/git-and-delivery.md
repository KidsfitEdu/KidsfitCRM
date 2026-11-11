# Git conventions for KidsfitCRM

## Branch baseline

Always inspect repo `develop` HEAD, existing worktree/staged state and current branch before creating a task branch. Do not assume default GitHub branch `main` is the integration target. For requested feature work, prefer PR target `develop`.

**Branch convention:** `type/short-kebab-case`, lowercase, ASCII, no spaces/diacritics, generally 2–4 meaningful words; optional issue identifier only if the project tracks it. Do not create name collisions without checking.

| Type | Example |
|---|---|
| feat | `feat/school-import` |
| fix | `fix/claim-expiry` |
| refactor | `refactor/shared-table` |
| db | `db/school-contacts` |
| test | `test/claim-race` |
| docs | `docs/crm-skill` |
| ci | `ci/mysql-tests` |
| chore | `chore/deps-update` |

Use Conventional Commits: `feat(schools): validate Excel imports`, `fix(claims): prevent duplicate allocation`, `refactor(ui): reuse pagination`. Avoid `update`, `fix bugs`, or ambiguous branch names. One logical concern per commit; no secrets or real DB dumps.

## Commit discipline — avoid fragmented PR histories

**Goal:** A reviewer can understand a PR from coherent, separately reviewable commits. The user explicitly prefers **multiple meaningful commits for distinct changes** over repeatedly rewriting the same single commit. Do not create a new commit for every edited file or trivial formatting change.

- **Commit by logical unit, not by iteration.** Finish the behavior and its related regression tests, lint/build checks, and corrections before the commit when feasible. A feature spanning multiple files may belong in one commit; distinct independently reviewable concerns (for example schema/backend, UI, or tests) may warrant separate commits.
- **No numeric cap or one-commit target.** Commit count follows logical, independently reviewable units (e.g. API/domain, UI/presentation, test/CI, accessibility). Several related file edits may share one commit; unrelated changes must not. Never squeeze unrelated work together or pad the history merely to hit a count.
- **Before each commit:** inspect `git status --short`, `git diff`, and `git diff --cached`; stage only requested paths (`git add <path>` / `git add -p` where useful); verify no secrets, generated/build artifacts, dumps, unrelated formatting, or unapproved changes. Check that the staged diff and commit title tell one coherent story.
- **Commit message:** Conventional Commits with an accurate scope and direct action: `feat(nt01): implement contract expiry reminders`, `feat(nt01): add scoped notification UI`, `test(nt01): cover expiry and access rules`. Avoid messages like `fix`, `more fixes`, `test again`, `wip`, or repetitive numbered fixups as final PR history.
- **During development:** local working changes do not need frequent commits. If commits are needed as checkpoints, clearly keep them local until cleaned up; checkpoint commits must not become a noisy PR by default.
- **Clean an unpublished local branch** using amend or interactive squash/rebase only if safe and authorized under the workflow. Before modifying history, check whether commits were already pushed, reviewed, or based on by teammates. **Never automatically amend another author's commit, rewrite shared/published history, or force-push.** If pushed, recommend a safe alternative (e.g. maintain clean additional commits and ask before coordinated rewrite; use repository-approved Squash and Merge upon merge).
- **PR readiness:** inspect `git log --oneline develop..HEAD` (after updating the comparison ref as appropriate) and `git diff --stat develop...HEAD`; ensure each commit is meaningful and the PR scope is focused. Report both commit count and rationale if it is unusually high. Leave PR as draft when implementation or checks are incomplete.
- **Approval boundary:** do not create commits, push, open or merge PRs without task authorization. Do not use squash/merge as a substitute for reviewing code quality, DB safety and tests.

### Example for NT-01

One reviewable plan *if actual dependencies and diffs support it*:

1. `feat(nt01): implement contract expiry notifications` (entity, migrations, worker, scoped API and tightly coupled backend tests)
2. `feat(nt01): show scoped reminders in CRM` (shared notification UI, role navigation)
3. `test(nt01): cover expiry milestones and access boundaries` (additional independent regression/integration coverage)

These are illustrative groupings, not instructions to rewrite the existing PR with 26 commits without checking who else uses its history. Testing changes closely tied to code may be included in commits 1–2, so a third test-only commit is optional.

## PR rules

PR to `develop` with title/summary, requirements IDs, files changed, UI before/after if appropriate, migration + data safety notes, actual tests, breaking changes and OPEN blockers. No automatic merge, forced push or history rewrite unless explicit instruction and safety check. Do not claim a PR exists without successful GitHub action. Do not commit at all when user asks only for design/confirmation.

## Current user preference (2026-11-11)

- **Never** repeatedly reset an already-pushed PR branch just to keep one commit. This discards history and makes GitHub links to earlier SHAs confusing.
- Prefer new incremental commits on an open approved PR for follow-up scope, with exact concise title (`style(accounting): ...`, `fix(accounting): ...`, `test(accounting): ...`). No force-push/amend/rebase to rewrite published history unless explicitly approved.
- When PR already **merged/closed**, do not keep pushing to its branch. Re-check `develop`, then ask for or follow approved new implementation/PR scope.
- Report **which commit actually exists**, not an earlier proposed commit message. If user asks whether a named commit exists, inspect GitHub actual commit log rather than asserting from memory.
- Do not claim PASS for SHA A using CI run from SHA B; give each workflow URL and commit. Never treat Draft status as equivalent to readiness.