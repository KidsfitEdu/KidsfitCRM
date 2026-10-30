# One-run quality gates

Execute safe steps continuously in one coding-agent job, with checkpoints rather than approvals after each stage.

| Step | Work | Gate |
| --- | --- | --- |
| 0 | Refresh `PHASE_0_BASELINE_AUDIT.md`, current HEAD, baseline tests | File/source matrix and actual statuses |
| 1 | Build KEEP/FIX/MERGE/REMOVE manifest | Dependencies, routes, FKs, test coverage proven |
| 2 | Database migration/role plan | Only isolated disposable DB writes; rollback/restore strategy |
| 3 | Seven-role backend and Sales claims | Permission, tenant, quota 10, 5+7×3, race tests |
| 4 | CHECKEE, finance, CSKH | No pre-verification grant or unapproved 30% payout |
| 5 | Frontend `frontend/src/` | Real API integration, responsive/dark/a11y and regression |
| 6 | Demo account seed | All synthetic backend users use environment-provided common password; second seed idempotent |
| 7 | Test MySQL dump/restore | Isolated source and destination; else mark NOT_RUN |
| 8 | Backend/MySQL/frontend/browser tests | PASS/FAIL/SKIPPED/NOT_RUN truthfully reported |
| 9 | Docs/skills and PR | Changed/deleted files, DB effects, remaining OPEN policies, final PR |

Only stop the unsafe/policy-dependent slice; progress on the rest. No auto-merge. One-run does not mean one huge untested commit.
