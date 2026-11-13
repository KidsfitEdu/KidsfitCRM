# Product decision log — 2026-10-30

This is a **business decision record**, not an assertion that code was migrated. Source: stakeholder discussion leading to `CRM_Functional_Specification.docx`; earlier `CRM_Report(2).docx` and repository Notes provide background. Product owners must authorize any change from CONFIRMED to a different policy.

| Decision ID | Status | Decision | Relationship to older repo docs |
| --- | --- | --- | --- |
| D-01 | CONFIRMED | Seven target roles: Admin, BGĐ KIDSFIT, Kế toán, Quản lý bán hàng, CSKH, CHECKEE, Sales | Supersedes 8-role report and 9-role demo **as business model**; keep legacy stored codes pending migration |
| D-02 | CONFIRMED | Employee Sales and collaborator share **SALES** business role; membership personnel type optional | Supersedes separate NV/CTV privileges as product target |
| D-03 | CONFIRMED | Both Sales types self-register AND accept manager allocation | Replaces assumption that employee only receives assigned leads |
| D-04 | CONFIRMED | Both Sales types default to **10 concurrent schools**, Admin may adjust | Repo currently limits mainly collaborators; implementation change needed |
| D-05 | CONFIRMED | Protection begins at **5 days**; extension per approval **7 days**, max **3 times** | Supersedes old DRAFT 7d × 2 and old notes saying 7 days not yet approved |
| D-06 | CONFIRMED | New school route: Sales → direct KIDSFIT/partner manager → Admin | Retain manager/Admin stage before canonical import |
| D-07 | CONFIRMED | Contract: Sales → direct KIDSFIT **or partner** manager → **directly CHECKEE** → authorized KIDSFIT grant for 5 years from verification | Supersedes proposal of routine BGĐ intermediary; Admin not a routine contract processor |
| D-08 | CONFIRMED | BGĐ KIDSFIT oversees KPIs, policy, conflict and exception; no review of every contract | Clarifies role responsibility |
| D-09 | CONFIRMED | Drop referrer/person-at-school commission split feature entirely | No new referrer entity/API/report |
| D-10 | SUPERSEDED by D-17 | The 2026-11-04 Sales-only 30% rate remains a historical rule, not the rate for new receipts | Historical accrued/paid amounts remain immutable; future accruals use BGĐ 25% Sales + 5% Manager or scoped overrides. |
| D-11 | PARTIALLY RESOLVED by D-17 | Eligible actual collected cash at receipt time is the base; Sales and Manager receive distinct entitlements and payouts. Taxes, withholding exceptions, paid clawbacks, and historical backfill remain review items. | No automatic recalculation of historical payments; adjustments and backfill require audit. |
| D-12 | OPEN | Which specific KIDSFIT role performs post-CHECKEE long-term grant | Legacy code assigns Admin; requires dedicated delegated permission decision |
| D-13 | OPEN | SLA and exact protection semantics of pending extension requests | Do not infer automatic waiting extension |
| D-14 | OPEN | Branch/main-school ownership and 5-year coverage where legal contracts differ | Current import assumes protection per main school |

| D-15 | CONFIRMED | Proposal forwarding is a manager confirmation with no manual Admin deadline/reason fields. Admin review SLA follows the active school workflow policy; absent a policy, default 72 elapsed hours. Overdue PENDING_ADMIN proposals warn central KIDSFIT Admin and notify KIDSFIT Director through persistent, non-duplicated CRM notifications, without automatic approval. | Applies to school-proposal escalation only; extension/other SLAs remain OPEN |

## Decision precedence and delivery

The decisions above modify the target business specification, not pre-existing financial ledgers, claims, migrated role assignments or contracts. Changes to code require a separately reviewed migration/PR, coverage for old data, and updated tests. Unresolved decisions must remain unresolved rather than choosing convenient defaults.
| D-16 | CONFIRMED (2026-11-13), financial integration in D-17 | Only BGĐ configures default 25% Sales + 5% Manager and scoped overrides (Sales > Manager > System), with versioning and audit. | D-17 connects these policies to new receipt accruals. The former independent financial-policy table is retired; old paid ledger records are preserved. |

| D-17 | CONFIRMED (2026-11-13) — replaces D-10/D-11/D-16 financial separation | BGĐ `board_commission_policy_versions` is the sole source for future commission accruals. Default 25% Sales + 5% Quản lý, overrides Sales > Manager > System, calculated on eligible cash actually received. Each receipt may create two role-specific ledger entries and independent Sales / manager payout documents. Freeze policy/version, rate, beneficiary and amount for financial history; do not rewrite paid entries when BGĐ changes a rate. Unassigned/invalid manager share remains pending review, never automatically allocated to another user. | D-10 historical 30% entries stay unchanged; the old `commission_policy_versions` table and legacy endpoint are retired via migration with historical policy codes snapshotted onto ledgers. Production financial data migration/backfill requires backup and separate verification. |
| D-18 | CONFIRMED (2026-11-13) — shared accounting/BGĐ payout approval | Kế toán và BGĐ xem cùng bản ghi `payouts`, không tạo bảng phiếu chi BGĐ riêng. Hệ thống đề xuất % và tiền theo ledger/chính sách BGĐ; Kế toán được chỉnh % Hoa hồng hoặc Tiền hoa hồng trên Nháp, lưu đồng thời đề xuất hệ thống và số đề nghị. Nếu khác đề xuất, cần lý do bắt buộc trước khi gửi duyệt. Trạng thái: DRAFT → PENDING_APPROVAL → APPROVED → PAID hoặc CHANGES_REQUESTED → chỉnh → gửi lại. BGĐ có quyền phê duyệt/yêu cầu bổ sung với lý do; người lập không được tự duyệt. | Chỉ Kế toán được ghi nhận thanh toán sau duyệt, mã giao dịch + chứng từ thanh toán bắt buộc. Phiếu đã duyệt/đã chi không sửa trực tiếp. Giữ `payout_items`, `payout_events` và audit để chống chi trùng và truy vết lịch sử. Dữ liệu thanh toán cũ phải giữ nguyên. |
