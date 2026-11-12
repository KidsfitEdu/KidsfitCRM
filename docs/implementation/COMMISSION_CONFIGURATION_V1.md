# Commission configuration v1 — BGĐ ceilings and Manager allocation

Status: **configuration implemented in PR #112 (Draft)**. Financial booking/payout is **not** activated.

## Business contract

1. BGĐ maintains effective-dated, append-only policy versions. A KIDSFIT **SYSTEM** rule
   is inherited by active partners; a partner **ORGANIZATION** rule overrides it.
   BGĐ may grant **MANAGER** or **SALES** ceilings and initial split exceptions.
2. Sales Manager configures a separate **MANAGER** stream of Sales-specific splits,
   limited to their own active direct reports and organization.
3. Matching precedence: BGĐ Sales exception → BGĐ Manager exception → BGĐ
   Organization exception → BGĐ System default.
4. For each Sales, Manager allocation takes precedence when it is effective **and**
   sales_percent + manager_percent <= current applicable BGĐ ceiling and the\n   manager_percent <= the separate BGĐ manager-share ceiling. Splits can total\n   less than the maximum.
   Otherwise the BGĐ default split is shown with a conflict flag.
5. New Managers/Sales inherit matching policies without per-person seed copies.
6. Edits apply immediately. The backend records the server timestamp and creates an\n   append-only version. Users do not enter reasons or effective dates; reset creates an\n   explicit audit event and reverts to inherited configuration. No historical ledger, receipts or payouts are mutated.
7. BGĐ's policy versions and Manager's split versions are stored independently.
   A lower limit or a reset which would invalidate any existing valid Manager\n   allocation is rejected until the Manager adjusts or restores their split.\n   A limit change does not overwrite Manager data and cannot retroactively\n   recalculate earlier commissions.
8. Backend permissions require BGĐ policy management or Sales Manager team
   management with active organization membership. Manager actions are checked
   against the currently authenticated actor, not caller-supplied manager IDs.

## Design

- **BGĐ / Chính sách** → underlined tabs: Chính sách hoa hồng / Chính sách vận hành.
  Filterable policy table, scope selectors, versioned create/replace, details/history
  shared central AppDialog with immediate-save flow, icon actions, history Drawer\n  and reset-to-inheritance confirmation.
- **Quản lý / Đội ngũ** → underlined tabs: Nhân sự / Phân bổ hoa hồng.
  Searchable/paginated Sales table, ceiling and applied split, source/conflict,
  versioned adjustment AppDialog and visible per-Sales configuration history.
- "Lịch sử trao đổi với trường" belongs to a distinct Sales-oversight feature,
  intentionally out of scope.

## Data/API

- New entity: `CommissionAllocationVersion`, table `commission_allocation_versions`.
- Migration: `20261112173000_CommissionAllocationVersions` (additive).
- Director:
  - `GET /api/channel-sales/commission-config/board`
  - `POST /api/channel-sales/commission-config/board`
  - `POST /api/channel-sales/commission-config/board/{id}/cancel`
- Sales Manager:
  - `GET /api/channel-sales/commission-config/manager`
  - `POST /api/channel-sales/commission-config/manager`
  - `POST /api/channel-sales/commission-config/manager/{id}/cancel`
- All write actions are append/cancel oriented and auditable.

## Decisions still required before actual money processing

**D-11 OPEN:** qualifying base, earned-on trigger, deductions/refunds, tax,
approval and payout cadence. The existing single-beneficiary legacy ledger
uses a separate `CommissionPolicyVersion` and is deliberately unchanged.

The example **25% Sales + 5% Manager = 30% total** is not automatically inserted
as an active financial policy. BGĐ must save a configuration version with an
a new configuration. A 30% legacy Sales ledger entry is not converted into 25/5.

## Verification and follow-up

- Isolated `.NET` unit/model tests and scoped frontend type/lint checks are
  tracked by `commission-config-validation.yml`.
- Existing `phase-1-mysql.yml` still invokes deprecated `--seed-demo`,
  and existing global frontend lint has unrelated errors. These remain separate
  baseline CI issues, not authorization to modify unrelated modules in this PR.
- Before merge: verify MySQL migration on an isolated DB, scoped permissions
  with active/suspended personnel, concurrency, future ceiling reduction,
  server-side pagination, UI screenshots/dark mode and stakeholder approval
  of the financial policy transition.

## Confirmed UI and risk handling (2026-11-12)

- BGĐ policy table uses AppPageHeader, underlined tabs, AdminListToolbar,
  AdminListPanel, AdminIconAction, AppPagination and a central AppDialog.
- Manager allocation uses the same shared list/dialog design.
- Forms do not ask for reason or effective date. Save applies immediately,
  audited with actor, before/after version history and server timestamp.
- BGĐ sets separate Manager-percent ceiling. Manager splits below the maximum
  are allowed, but any overshoot of total or Manager ceiling is rejected.
- Reducing/resetting BGĐ limits is rejected when current valid Manager
  allocations would exceed the inherited new constraints.
- Historical ledger/payout, commission calculation base and financial activation
  remain unchanged and await separate approval (D-11).
