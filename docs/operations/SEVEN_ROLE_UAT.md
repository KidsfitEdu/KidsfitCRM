# KIDSFIT CRM — seven-role UAT and UI QA

**Scope:** staging or disposable data only, never a test run against production financial or personal records. Create unique authorized test accounts and organizations without committing credentials.

| Role / area | Workflow to verify | Security and UX checks |
| --- | --- | --- |
| Admin | School import preview/commit, canonical duplicates, staff scope, Sales quota overrides, proposal decisions | Cross-organization rejection, clear validation and mobile table/Drawer |
| Director (BGĐ) | KPI time period, versioned 25% Sales + 5% Manager policy, payout approve/return for changes | Cannot self-approve authored payout; immutable historical ledger; no fabricated chart series |
| Accountant | Contracts, revenue receipts, refunds, create/update/submit payout, mark PAID with reference and evidence | D-18 transitions, no duplicate payment, clear pending/error/draft states |
| Sales Manager | Proposal forwarding, quota allocations, extension review, contract referral to CHECKEE, team income | Team-only data, no action on another organization's schools |
| Customer Service | Assignment, handover, annual renewal reminder and interruption | Scoped cases, notifications, safe long-text and empty/loading |
| CHECKEE | Verify/reject contract with evidence and reason, technical support | No unauthorized KIDSFIT five-year grant; decision audit and file access |
| Sales (employee & CTV) | Register/assigned schools, max 10 slots, 5 days + 7 days × 3, activity, contract and income | Concurrent claim conflict, expiry, approved scope and mobile flow |

**OPEN policy:** D-12 final post-CHECKEE KIDSFIT grant actor remains unresolved; mark related flow `BLOCKED`, not guessed.

## Common interface checks

- 320, 375, 390, 768, 1024 and 1440 px; 200% browser zoom; keyboard-only operation; reduced motion and light/dark.
- Mobile bottom dock: three allowed shortcuts plus ellipsis, selected icon+feature text, overflow opens all authorized routes and displays selected overflow feature name.
- Data table: search vs filter reset, pagination, action menu, long Vietnamese content, zero/large data, loading and network error; no body-level unexpected horizontal overflow.
- Dialog and Drawer: focus trap/return, Escape, scroll with virtual keyboard, safe-area footer and duplicate-submit prevention.
- Dashboard and charts: sourced API values with correct period, no invented trend data, sensible loading/no-data/error/partial-failure states.
- Form feedback: exact field errors (422), session expiry (401), forbidden (403), conflict (409), throttling (429), backend fault (5xx), offline and retry.

## Signoff record

| SHA | Environment | Role | Scenario | Result (PASS/FAIL/NOT RUN/BLOCKED) | Reviewer | Evidence reference |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | NOT RUN | | |

Source inspection or a successful CI compilation is **not** UAT. Record actual browser / API evidence with sensitive fields redacted.
