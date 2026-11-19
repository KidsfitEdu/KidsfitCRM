# Git conventions for KidsfitCRM

## Branch baseline

Always inspect repo `develop` HEAD, existing worktree/staged state and current branch before creating a task branch. Do not assume default GitHub branch `main` is the integration target. For requested feature work, prefer PR target `develop`.

**Branch convention (required):** `type/module/feature`. Use a concise change type, a stable business/technical module, then the specific action or feature.

- Lowercase English ASCII only; use `kebab-case` for multiword segments, with `/` separating the three segments.
- No Vietnamese diacritics, spaces, personal names or date suffixes. Avoid generic names such as `update` or `fix-bugs`.
- Check existing branches and open PRs before creating a name; reuse an existing approved PR branch when appropriate.
- Do not rename an active/published PR branch or rewrite its history without explicit authorization.
- Choose the module that owns the change, and keep the feature segment short and precise.

| Type | Example |
|---|---|
| feat | `feat/sales/income-rates` |
| feat | `feat/manager/income` |
| fix | `fix/accounting/payout-approval` |
| refactor | `refactor/crm/shared-components` |
| chore | `chore/database/initial-seed` |
| test | `test/sales/commission-rates` |
| docs | `docs/crm/branch-naming` |
| ci | `ci/mysql/integration-tests` |

The naming rule applies to **new** branches. Existing historical branches remain valid; avoid unnecessary renames.

Use Conventional Commits: `feat(schools): validate Excel imports`, `fix(claims): prevent duplicate allocation`, `refactor(ui): reuse pagination`. Avoid `update`, `fix bugs`, or ambiguous branch names. One logical concern per commit; no secrets or real DB dumps.

## Commit discipline — avoid fragmented PR histories

**Goal:** A reviewer can understand a PR from coherent, separately reviewable commits. The user explicitly prefers **multiple meaningful commits for distinct changes** over repeatedly rewriting the same single commit. Do not create a new commit for every edited file or trivial formatting change.

- **Commit by logical unit, not by iteration.** Finish the behavior and its related regression tests, lint/build checks, and corrections before the commit when feasible. A feature spanning multiple files may belong in one commit; distinct independently reviewable concerns (for example schema/backend, UI, or tests) may warrant separate commits.
- **No numeric cap or one-commit target.** Commit count follows logical, independently reviewable units (e.g. API/domain, UI/presentation, test/CI, accessibility). Several related file edits may share one commit; unrelated changes must not. Never squeeze unrelated work together or pad the history merely to hit a count.
- **Before each commit:** inspect `git status --short`, `git diff`, and `git diff --cached`; stage only requested paths (`git add <path>` / `git add -p` where useful); verify no secrets, generated/build artifacts, dumps, unrelated formatting, or unapproved changes. Check that the staged diff and commit title tell one coherent story.
- **Commit message:** follow the focused subject standard below. Inspect the staged changes first; the subject must match the implementation, not the task plan. Avoid vague messages like `fix`, `more fixes`, `test again`, `wip`, or repetitive numbered fixups.
- **During development:** local working changes do not need frequent commits. If commits are needed as checkpoints, clearly keep them local until cleaned up; checkpoint commits must not become a noisy PR by default.
- **Clean an unpublished local branch** using amend or interactive squash/rebase only if safe and authorized under the workflow. Before modifying history, check whether commits were already pushed, reviewed, or based on by teammates. **Never automatically amend another author's commit, rewrite shared/published history, or force-push.** If pushed, recommend a safe alternative (e.g. maintain clean additional commits and ask before coordinated rewrite; use repository-approved Squash and Merge upon merge).
- **PR readiness:** inspect `git log --oneline develop..HEAD` (after updating the comparison ref as appropriate) and `git diff --stat develop...HEAD`; ensure each commit is meaningful and the PR scope is focused. Report both commit count and rationale if it is unusually high. Leave PR as draft when implementation or checks are incomplete.
- **Approval boundary:** do not create commits, push, open or merge PRs without task authorization. Do not use squash/merge as a substitute for reviewing code quality, DB safety and tests.

## Focused commit message standard

**Required subject format:** `<type>(<scope>): <action> <object>`, written in concise English. Keep the scope specific to the actual module or feature, and prefer a subject of no more than about 72 characters **without sacrificing correctness**. For a truly cross-cutting change, omit the scope only if no accurate scope exists.

- **Type reflects the result:** `feat` for a new capability, `fix` for a defect, `refactor` for behavior-preserving restructuring, `style` for presentation-only changes, `test` for standalone test coverage, `docs` for documentation, `chore` for maintenance, and `ci` for pipeline changes. A database migration is not automatically `refactor`: choose the type by its actual effect.
- **Action + object:** begin with a direct verb such as `add`, `implement`, `validate`, `prevent`, `remove`, `simplify`, `display`, or `document`, followed by the specific changed behavior or component. Avoid `update` alone and do not describe merely the file name.
- **Truthful and narrow:** inspect the actual staged diff; never claim completed functionality, fixed bugs, passed tests or deployed behavior that the change does not establish. Do not combine unrelated modules in one commit or hide destructive changes behind a vague title.
- **Logical grouping:** a commit can include related code, configuration, migration and regression tests needed for one outcome. Do not commit each file, intermediate attempt, trivial tweak or CI rerun separately just to increase the count. Split distinct reviewable outcomes when warranted, with no fixed number of commits.
- **Optional body:** explain *why*, non-obvious tradeoffs, migration or breaking impact when useful; do not repeat the subject or add boilerplate to a simple change. Mark actual breaking changes explicitly according to Conventional Commits.
- **Before pushing:** review the proposed subject against the staged paths and diff, scan for secrets/generated files, and inspect `git log` for duplicate or misleading titles. Do not amend/rebase/force-push published history without explicit authorization; use focused follow-up commits instead.
- **Never pad titles:** no dates, author names, arbitrary numbers, emoji, unnecessary punctuation or self-congratulatory terms.

| Actual change | Good subject | Avoid |
|---|---|---|
| Add Sales rate display | `feat(sales): display commission rates` | `update sales` |
| Preserve verified file extensions | `fix(storage): preserve uploaded file extensions` | `fix file` |
| Centralize upload limits without behavior change | `refactor(storage): centralize upload size validation` | `update code again` |
| Align Accounting layout only | `style(accounting): align renewal forms` | `fix accounting` |
| Remove legacy BLOB storage and change persistence | `refactor(storage): replace evidence BLOB persistence` | `database changes` |
| Independently add upload limit tests | `test(storage): cover upload size limits` | `tests` |
| Clarify Git naming guidance | `docs(crm): clarify branch naming rules` | `documentation updates` |

**Example of reviewable grouping** (not an instruction to rewrite published commits):
```text
refactor(storage): move evidence files to local storage
feat(storage): preserve verified file extensions
feat(storage): configure maximum upload size
test(storage): cover file validation and access
```

### Example for NT-01

One reviewable plan *if actual dependencies and diffs support it*:

1. `feat(nt01): implement contract expiry notifications` (entity, migrations, worker, scoped API and tightly coupled backend tests)
2. `feat(nt01): show scoped reminders in CRM` (shared notification UI, role navigation)
3. `test(nt01): cover expiry milestones and access boundaries` (additional independent regression/integration coverage)

These are illustrative groupings, not instructions to rewrite the existing PR with 26 commits without checking who else uses its history. Testing changes closely tied to code may be included in commits 1–2, so a third test-only commit is optional.

## CI evidence and failure triage

- Before writing/pushing when execution is available: validate TSX syntax, run lint + TypeScript, focused tests and appropriate build. With GitHub-only edits and no local runnable checkout, disclose that pre-push checks were unavailable and rely on exact-SHA CI; keep PR Draft until verified.
- After each push, wait for and inspect the **new HEAD** workflow run. Never attach a PASS from an older commit to a new SHA.
- For any red unit suite, capture failing test names and compare unchanged baseline vs changed branch. Label new regression / base failure / obsolete assertion requiring authorized update / blocked; do not silently mark “known old”.
- Integrate test changes with the behavior they exercise; avoid accumulating preventable red CI across many small commits.
- Do not merge/deploy without separately authorized approval and successful required checks. A PR can be code-complete but validation-incomplete; report both separately.

## PR rules

PR to `develop` with title/summary, requirements IDs, files changed, UI before/after if appropriate, migration + data safety notes, actual tests, breaking changes and OPEN blockers. No automatic merge, forced push or history rewrite unless explicit instruction and safety check. Do not claim a PR exists without successful GitHub action. Do not commit at all when user asks only for design/confirmation.

## Current user preference (2026-11-11)

- **Never** repeatedly reset an already-pushed PR branch just to keep one commit. This discards history and makes GitHub links to earlier SHAs confusing.
- Prefer new incremental commits on an open approved PR for follow-up scope, with exact concise title (`style(accounting): ...`, `fix(accounting): ...`, `test(accounting): ...`). No force-push/amend/rebase to rewrite published history unless explicitly approved.
- When PR already **merged/closed**, do not keep pushing to its branch. Re-check `develop`, then ask for or follow approved new implementation/PR scope.
- Report **which commit actually exists**, not an earlier proposed commit message. If user asks whether a named commit exists, inspect GitHub actual commit log rather than asserting from memory.
- Do not claim PASS for SHA A using CI run from SHA B; give each workflow URL and commit. Never treat Draft status as equivalent to readiness.