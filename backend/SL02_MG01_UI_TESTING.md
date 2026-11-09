# Phần 4 — SL-02 / MG-01 / KF-01 (v2)

> Draft PR only. Do not merge or seed into an existing populated database without migration review/backup.

## Current UI

- Sales KIDSFIT: **Trường của tôi → Quyền bảo vệ 5 năm**.
- CTV đối tác: **Tiếp cận & tư vấn** → panel bảo vệ.
- Quản lý bán hàng: **Hợp đồng & xác minh** → hàng đợi gia hạn bảo vệ.
- KIDSFIT is an organization, NOT a new role. Approval requires active **SALES_MANAGER** role, active **KIDSFIT** organization membership, and `channel_sales.protection.renewal.approve` permission.
- BGĐ supervises but does not approve routine requests.

## Rules

1. A verified source contract and its historic protection remain unchanged. Only `CustomerProtection` gets a new five-year cycle after a valid KIDSFIT manager approval.
2. The 15-day window is a **temporary priority**, not an extension of the contract or five-year protection.
3. Sales other than the owner cannot register the same school during the reserved window when the two expiries are aligned.
4. Requests start up to 30 days before protection expiry; automatic sweep runs hourly, deduplicated by contract, expiry and owner.
5. If the new year's KC-02 renewal is not **CONFIRMED**, requests are marked `WAITING_RENEWAL`; only a confirmed period covering the five-year boundary can move to `PENDING_MANAGER`.
6. If the 15-day priority expires with no confirmed renewal and no approved grant, pending cases become `EXPIRED`. The original Sales does not get an indefinite hold merely for submitting a draft.
7. A manager must recheck contract, owner, member status, confirmed coverage and current overlapping protections inside a transaction and with customer lock. Duplicate approval returns a conflict and cannot create a second cycle.
8. Disputes, cancelled contracts, suspended users and owner changes require manual handling and must not silently grant new protection.
9. The unresolved exception “submitted on time but Accounting has not decided by day 15” is not converted into an automatic hold pending policy approval.

## Opt-in UI demo data — disposable MySQL only

From repository root in PowerShell, create a **fresh separate database**, configure `ConnectionStrings__MySql` and JWT to point to that database, then:

```powershell
cd backend
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:Seed__DisposableDatabase = "true"
$env:Seed__ReviewFixtures = "true"
$env:Seed__ProtectionRenewalScenarios = "true"
$env:Seed__AccountingScenarios = "false"
$env:Seed__DemoPassword = "<choose-a-local-demo-password>"
dotnet run --project src/KidsfitCRM.Api -- --migrate --seed-demo
dotnet run --project src/KidsfitCRM.Api
```

Five fictional cases (relative to today's VN date): `SL02-A` expired yesterday and no renewal, `SL02-B` protects until +7 days and confirmed renewal, `SL02-C` expired 16 days ago, `SL02-D` expires today with Accounting pending, `SL02-E` CTV protection until +15 days and confirmed renewal. No real personal information.

Check `SELECT contract_code FROM sales_contracts WHERE contract_code LIKE 'SL02-DEMO-%';` returns five rows. Check `protection_renewal_cases` for unique cases. You can run the seed twice without duplicates. Test with `sales@kidsfit.vn`, `ctv@kidsfit.vn`, and `manager@kidsfit.vn` using the **local** seed password.

CI: `.github/workflows/phase-1-mysql.yml` runs the five-case demo twice on a separate MySQL 8.4 database. Existing unrelated integration test with `response_reason` column length may still fail, so check the job logs before acceptance.

## Branch cleanup

Old branch tip recorded: `8c2d45e02591f0fa786e73f250f408c07cfd09e4`. Old remote branch cannot be deleted using the current GitHub connector/browser without authenticated branch-delete privileges. Authorized developer can run:

```bash
git push origin --delete feat/sl02-mg01-protection-renewal
```

Only delete that branch, never `develop` or `feat/sl02-mg01-protection-renewal-v2`.
