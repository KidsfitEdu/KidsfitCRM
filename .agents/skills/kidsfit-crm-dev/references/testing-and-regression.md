# Testing and regression — evidence-based verification

> Work against the **exact branch HEAD/commit** being reported. Source examples and prior green CI runs do not establish the newest commit passed. This supplements [quality checklist](quality-checklist.md).

## Select tests by impact

| Change | Minimum evidence |
| --- | --- |
| Skill/Markdown-only changes | Parse frontmatter, verify local Markdown links and moved references, grep obsolete paths/claims; run source build only if runtime files changed |
| Shared UI (Header, modal, drawer, buttons) | Frontend lint/typecheck/unit/page/build; enumerate all component consumers and role routes; inspect rendered viewport/focus when possible |
| UX/mobile-only | Desktop/mobile widths 320/375/390/768/1024/1440 and zoom 200%, light/dark, keyboard/touch, virtual keyboard, safe areas, scroll/overlay |
| API/DTO/permission | Backend build/tests, actual HTTP snake_case serialization, 401/403/404/422/409 and target-organization isolation |
| School claims/extensions | MySQL 8.4 real concurrency, 10-slot cap, 5-day expiry and approved extension count, duplicate ownership, manager scopes |
| Contract, KC-02, CHECKEE, GI-01 | Status transition matrix, actor permissions, yearly renewal vs original contract, protections only when authorized, scheduled worker replay |
| Commissions/payout/refunds | D-17/D-18, exact decimal/VND, immutable ledger history, dual actor approval, idempotent payment, signed evidence, rollback |
| Notification worker or inbox | Recipient/org scope, read/resolve state, retry & second occurrence, cross-org revocation, batched worker, real pagination and target navigation |
| EF migration/schema | Apply full chain twice on **isolated** MySQL 8.4, inspect model snapshot/pending changes, non-empty seed and backup/restore as applicable; never run on unverified shared DB |
| CI/release config | Workflow trigger/path coverage, secret handling, dev vs production, reproducibility; staging smoke and rollback readiness before claiming release |

## Current commands (re-check scripts before executing)

- From `frontend/`: `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run test:pages`, `npm run build`. Inspect `frontend/package.json` for the authoritative versions; `test:demo` / `build:pages` are retired.
- Backend: `dotnet test backend/KidsfitCRM.slnx` and relevant targeted tests. Isolated MySQL CI: `.github/workflows/phase-1-mysql.yml`; use environment-gated test connection or explicit fresh disposable DB only.
- Check other relevant workflows under `.github/workflows/` (Frontend refactor, BGĐ commission, proposal escalation, auth). A docs-only PR may not trigger path-filtered workflows: report **NOT RUN**, not PASS.
- Repository GitHub source access is not proof of a local checkout, runnable browser, or test execution. Never pretend tools executed a command that was not actually invoked.

## Regression process

1. **Before changes**: capture `develop` HEAD, current PR status, source/consumer paths, contract/permission and baseline failures.
2. **Change scope**: list exact files and what must not change. For shared UI test every role consuming the component; for DB test data lifespan and cancellation/rollback; for notification test old alerts and repeated transitions.
3. **Run narrow tests** in the edited slice, then full workflows required by touch points. If CI fails, inspect logs and decide whether the issue reproduces at base HEAD before calling it preexisting.
4. **Evaluate** `PASS | FAIL | BLOCKED | NOT RUN` with exact SHA and explicit environment. Tests passing in MySQL CI do not certify live DB migration, mobile browser fidelity or production readiness.
5. **Handoff** changes, code/DB impact, test commands and results, unresolved decision IDs, role/record permission evidence and PR Draft/Open/Merged status. Never auto-merge/deploy.

## Safety checks

No operation may reset or truncate real or unknown-custody data. Keep financial/audit information immutable except explicitly approved append-only correction. Always scope test fixtures and prevent sensitive school/contact/payment information from reaching logs, snapshots or documentation. Use `docs/requirements/DECISION_LOG.md` to distinguish confirmed policy from proposals.
