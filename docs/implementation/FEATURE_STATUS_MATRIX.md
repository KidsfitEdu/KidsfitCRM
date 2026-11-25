# KIDSFIT CRM — feature implementation and verification matrix

**Source snapshot:** `develop` `4e9c99db374c082289608c60573a7894ee375834` (2026-11-21). This is a **static source inventory**; no live production test, browser QA or isolated MySQL test was executed for this document. Rows marked IMPLEMENTED mean **an entry point exists**, not that the full workflow passed acceptance tests.

| Feature | Intended business area | Frontend evidence | Backend evidence | Evidence status | Next verification |
| --- | --- | --- | --- | --- | --- |
| Authentication and profile | All seven roles | `components/layout/UserProfileMenu.tsx`, `screens/Auth/` | `AuthFeatures.cs`, `PasswordResetFeatures.cs`, `ApiEndpoints.cs` | IMPLEMENTED (source) | HTTP login/change-password/forgot/reset flow, invalid token/422/429/5xx |
| Schools/import and proposals | Admin, Manager, Sales | `screens/Admin/`, `screens/SalesManager/`, `screens/SalesStaff/` | `SchoolWorkbookReader.cs`, `SchoolProposalActions.cs`, `SchoolEndpoints.cs` | IMPLEMENTED (source) | Import preview/commit, duplicate/branch ownership, scoped approvals |
| Approach and extensions | Sales, Manager | `screens/SalesStaff/`, `screens/SalesManager/` | `SchoolAllocationActions.cs`, `SchoolActions.cs` | IMPLEMENTED (source) | Quota 10, concurrency and 5+7×3 expiry tests |
| Contract verification | Sales, Manager, CHECKEE | `screens/Checkee/` and sales/manager screens | `ManagerContractEndpoints.cs`, `ChannelSalesContracts.cs` | IMPLEMENTED (source) | Authorization/transition tests; D-12 grant actor OPEN |
| Renewals and service interruption | Sales, CSKH, Kế toán | `screens/Accounting/`, `screens/CustomerCare/` | `ContractRenewalEndpoints.cs`, associated policies/workers | IMPLEMENTED (source) | Yearly renewal, 12-month interruption, 5-year protection boundary |
| BGĐ commission policy | BGĐ, Sales, Manager | `screens/Board/`, income views | `BoardCommissionPolicyEndpoints.cs` | IMPLEMENTED (source) | D-17 version, 25%/5% defaults, scope overrides, frozen accrual |
| Payout approval and accounting | Kế toán, BGĐ | `screens/Accounting/`, `screens/Board/` | `Features/Accounting/{Payouts,Receipts,Workspace}/`, `AccountingContractEndpoints.cs` | IMPLEMENTED (source) | D-18 permission, dual-approval, receipts/refunds/reconciliation |
| Customer service and support | CSKH, CHECKEE | `screens/CustomerCare/`, `screens/Checkee/` | `CustomerCareEndpoints.cs`, school care/support features | IMPLEMENTED (source) | Scoped cases, audit, notifications, assignment |

## Distinct states
- `CONFIRMED`: approved requirement or decision, not test result.
- `OPEN`: decision not authorized; no invented default.
- `IMPLEMENTED`: code path exists and is mapped to a feature; **not** runtime proof.
- `VERIFIED`: tests/observed scenario actually passed, with SHA and environment.
- `BLOCKED`: source access, test isolation, policy or dependent service prevents proof.

## Procedure
For a feature change, add exact file/endpoint/test references and record the current SHA, date, environment and outcomes (PASS, FAIL, NOT RUN, BLOCKED). Confirm entity mapping, permissions, organization scope, rollback, concurrency and audit as relevant. Update this matrix and `CODEBASE_GAP_ANALYSIS.md` in the same PR that modifies the source.

Do not turn the complete list of existing screens into an assertion that business processes have been end-to-end verified.
