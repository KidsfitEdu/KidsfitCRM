# Broad-scope implementation checklist

| Gate | Expected evidence |
| --- | --- |
| Scope | Explicit approval, current `develop` HEAD, no duplicate active PR |
| Requirements | D-17/D-18 and other approved decisions; OPEN items retained |
| Keep/Rewrite/Merge/Remove | Dependency evidence (routes, imports, EF references, permissions, tests) |
| Runtime | React/Vinext Real API Only and .NET 10/MySQL 8.4 preserved |
| API | Request/response snake_case, auth/tenant scope, status codes and idempotency |
| Database | No real/shared data writes; migration snapshot compared to model if relevant |
| Bootstrap | **No `--seed-demo`**; `--seed-initial` only on verified disposable Development DB |
| Finance | Default future 25% Sales + 5% Manager, D-18 payouts; old paid records frozen |
| Tests | Exact SHA, passed/failed/not run/blocker, isolated MySQL where necessary |
| Delivery | Updated docs/skills, Conventional Commits and PR to `develop` (no auto-merge) |

One-shot does **not** mean bypassing safety gates or claiming tests passed without running them.
