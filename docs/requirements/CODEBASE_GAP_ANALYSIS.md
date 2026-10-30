# Implementation gap analysis vs CRM business baseline

**Review snapshot:** `develop` at `53f3136caea5b4c38316440f5045e37bfaf77b87`, inspected 2026-10-30. This is a static source review, **not** a passing integration test or complete audit. Scope: docs/skill alignment, no product-code changes in this PR.

| Gap | Source observation on develop | Intended business target | Priority / safe follow-up |
| --- | --- | --- | --- |
| GAP-01 7 roles | `DatabaseSeeder.cs` seeds `BOARD`, `CHANNEL_SALES`, `PARTNER_ADMIN`, `PARTNER_COLLABORATOR` alongside other roles; README mentions nine demo roles | Seven business roles, Sales merged | **P0** Create compatibility mapping, permission parity and staged migration; preserve user-role/history |
| GAP-02 Sales limit | `docs/SCHOOL_CRM_IMPLEMENTATION.md` and Notes explicitly state only collaborator capacity enforced; `SchoolWorkflowTests.cs` tests `PARTNER_COLLABORATOR` | Both internal/partner Sales default **10 concurrent** | **P0** Audit capacity paths and migrate default policy, add multi-organization and concurrent-slot tests |
| GAP-03 Extensions | `school-directory-workflows.md` says 7d is unapproved; Notes DRAFT suggests **7d × 2** | **7d × 3**, 5-day initial | **P0** Update versioned `ACTIVE` policy with formal change audit; test 3rd approved/4th rejected, stale expiry races |
| GAP-04 Contract post-verification | `SchoolWorkflowTests.cs` shows Manager review → CHECKEE confirm → **Admin** `GrantSchoolProtection` | Manager (KIDSFIT **or partner**) sends directly CHECKEE; KIDSFIT final grant but **not routine Admin** | **P0** Choose KIDSFIT role for grant, update permission/endpoints/tests without historical contract rewrite |
| GAP-05 Partner direct CHECKEE submit | `SchoolContractReview` exists for manager and partner admin; tests verify review stage, not necessarily complete UI direct-submit affordance | Direct manager handoff to CHECKEE, no Director gate | **P0** Verify API state transition, UI routing and organization scoping before claiming done |
| GAP-06 Provisional commission | `DatabaseSeeder.cs` has 20%/15% ceilings; README describes 10%/12% policy demos; commission ledger and payouts exist | Sales **30% provisional**; base/effective date OPEN | **P0 policy** No production activation until finance approves; do not silently replace demo rate with live default |
| GAP-07 Frontend workspaces | `crm-app.tsx`, `demo-auth.ts` retain distinct `SalesStaffWorkspace`, `CollaboratorWorkspace` and partner demo profiles | One Sales experience with organization-aware scope/personnel metadata | **P1** Combine UI/routes carefully, keep seed/test compatibility and no duplicate navigation |
| GAP-08 Referrer split | No confirmed new referrer requirement; previous discussion explicitly discarded it | No referrer split UI, model or payout | **Guardrail** Reject future unrequested referrer features |
| GAP-09 Source/docs authority | Existing `AGENTS.md`, skill, planning docs and report snapshots contain earlier role and extension assumptions | Single up-to-date requirements source plus history | **This PR** Update docs/skill/links and preserve legacy implementation notes |
| GAP-10 Parent-school scope | `school-directory-workflows.md` uses parent-school protection per import assumption | Need explicit policy if branches contract independently | **OPEN** Retain schema semantics; prevent unintended broadened protection |
| GAP-11 Financial and other bounded contexts | Repo supports education center modules, receipts, ledger, demo data | Preserve all functioning areas | **Safety** Do not delete students/parents/class model, mutate paid ledger or replace migrations just to align roles |

## Prioritized code migration proposal (not part of this documentation change)

1. Decide authorized KIDSFIT post-CHECKEE grant role, precise extension pending SLA and 30% finance policy.
2. Introduce role alias/mapping and server policy mapping for 7 target roles; check existing memberships and partner scopes. Keep legacy roles as data during rollout.
3. Extend default quota to all Sales memberships; keep ongoing protected slots and audited overrides; test simultaneous registrations.
4. Make extension policy **7d×3** an auditable ACTIVE configuration, not a constant smuggled into old policy records. Test concurrency, rejection, expiry.
5. Normalize contract verification queue and Manager→CHECKEE direct-send action; reconcile post-verification grant authorization with Admin exclusion.
6. Consolidate Sales frontend navigation; remove separate referrer functionality if it is accidentally introduced.
7. Update demo fixtures/README, test MySQL 8.4 (RBAC, idempotency, rollback, scope, finance), then stage migration and conduct stakeholder UAT.

## Verification and reporting rules

- `dotnet test backend/KidsfitCRM.slnx`
- `backend/test-mysql.ps1` on isolated MySQL 8.4 (not SQLite-only)
- `cd frontend && npm run lint && npx tsc --noEmit && npm run build`
- Compare actual role permissions and exported business state before/after migration; audit histories never destroyed.
- Update this gap matrix and `docs/implementation/` with test evidence each time code changes. Static source review alone is not proof tests passed.
