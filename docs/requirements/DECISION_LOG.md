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
| D-10 | PROVISIONAL | Commission **30% for Sales**, employee and collaborator alike | Percentage mentioned as expected, not approved payout rule |
| D-11 | OPEN | Commission calculation base (contract amount vs collected revenue), triggering event, approval, taxes and effective policy | Do not hardcode 30%; legacy 10%/12%/ceilings are demo |
| D-12 | OPEN | Which specific KIDSFIT role performs post-CHECKEE long-term grant | Legacy code assigns Admin; requires dedicated delegated permission decision |
| D-13 | OPEN | SLA and exact protection semantics of pending extension requests | Do not infer automatic waiting extension |
| D-14 | OPEN | Branch/main-school ownership and 5-year coverage where legal contracts differ | Current import assumes protection per main school |

| D-15 | CONFIRMED | Proposal forwarding is a manager confirmation with no manual Admin deadline/reason fields. Admin review SLA follows the active school workflow policy; absent a policy, default 72 elapsed hours. Overdue PENDING_ADMIN proposals warn central KIDSFIT Admin and notify KIDSFIT Director through persistent, non-duplicated CRM notifications, without automatic approval. | Applies to school-proposal escalation only; extension/other SLAs remain OPEN |

## Decision precedence and delivery

The decisions above modify the target business specification, not pre-existing financial ledgers, claims, migrated role assignments or contracts. Changes to code require a separately reviewed migration/PR, coverage for old data, and updated tests. Unresolved decisions must remain unresolved rather than choosing convenient defaults.
