# Documentation and skills alignment — cleanup manifest

**Branch baseline:** `develop` at `4e9c99db374c082289608c60573a7894ee375834`, reviewed 2026-11-21. Documentation/skill changes only. Runtime application, schema, migrations and database remain untouched.

## Rewrite / update
| Path | Decision | Rationale |
| --- | --- | --- |
| `AGENTS.md` | REWRITE stale header and guardrails | Replace old demo seed and obsolete provisional 30% policy with live runtime and D-17/D-18 |
| `docs/README.md` | REWRITE | Central task routing and status/evidence vocabulary |
| `docs/requirements/CODEBASE_GAP_ANALYSIS.md` | REWRITE | Retire 2026-10-30 file-path assertions and removed commands |
| `docs/implementation/CURRENT_SOURCE_MAP.md` | REWRITE | Map actual app, endpoints, auth, seed and CI on current snapshot |
| `.agents/skills/kidsfit-crm-dev/SKILL.md` | UPDATE | Current HEAD, data, source and API contract guardrails |
| `.agents/skills/kidsfit-crm-development/SKILL.md` | FIX + UPDATE | Repair YAML frontmatter, superseded 30% and seed paths |
| `.agents/skills/kidsfit-crm-dev/references/business-rules.md` | UPDATE | Confirm D-17/D-18 supersession of historical D-10 |
| `.agents/skills/kidsfit-crm-one-shot-implementation/SKILL.md` | REWRITE | Make broad implementation explicitly scoped; no retired demo runtime |
| `.agents/skills/kidsfit-crm-one-shot-implementation/references/demo-data-and-credentials.md` | REWRITE | Guarded initial bootstrap and isolated synthetic tests |
| `.agents/skills/kidsfit-crm-one-shot-implementation/references/one-shot-checklist.md` | REWRITE | Current quality and safety gates |
| `.agents/skills/kidsfit-crm-dev/references/kc02-gi01-accounting.md` | UPDATE | Correct superseded 30% statement |
| `.agents/skills/kidsfit-crm-dev/references/ai-workflow.md` | UPDATE | Remove `--seed-demo` from active operational list |
| `docs/prompts/MASTER_CRM_IMPLEMENTATION_PROMPT.md` | REWRITE | Replace old runnable demo/seed workflow with current safe prompt |
| `docs/testing/CRM_SYNTHETIC_SEED_SCENARIOS.md` | REWRITE | Remove invalid startup commands; reframe as test scenario specification |

## Add
- `docs/architecture/API_CONTRACTS.md` — request naming, authentication and HTTP errors.
- `docs/implementation/FEATURE_STATUS_MATRIX.md` — explicit distinction between source evidence and verified functionality.
- This manifest for auditable changes.

## Kept and excluded
- Approved `DECISION_LOG.md`, functional specification, historical migration files, data models, application code and tests are not rewritten as part of a documentation-only request.
- Frontend design and Webapp UX skills are retained; no current-source evidence required a wholesale redesign of their contracts.
- Historical implementation notes may remain for provenance, but **cannot** override newer decisions or the active source map. Check backlinks before removing any historical file.

## Validation evidence
- Source/paths and claims were inspected using the GitHub repository connector at the listed SHA.
- No app tests, TypeScript build, isolated MySQL integration, browser QA, migration or production deployment was run for documentation-only changes.
- Markdown links, metadata and stale-instruction searches should be checked again on the resulting PR diff; source inspection is not proof of successful runtime operation.
