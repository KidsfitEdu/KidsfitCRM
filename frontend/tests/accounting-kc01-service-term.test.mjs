import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test('KC-01 accountant contract API keeps scoped verified-only records', () => {
  const api = read('../backend/src/KidsfitCRM.Api/Features/AccountingContractEndpoints.cs');
  assert.match(api, /verified = access.Contracts\(db\)\.AsNoTracking\(\)\.Where\(x => x.VerifiedAt != null\)/);
  assert.match(api, /service_start_on = contract.ServiceStartOn/);
  assert.match(api, /service_end_on = contract.ServiceEndOn/);
  assert.match(api, /payment_cycle = contract.PaymentCycle/);
  assert.match(api, /p.SourceType == "CONTRACT"/);
  assert.match(api, /p.Status == "ACTIVE"/);
  assert.match(api, /RECORD_CONTRACT_SERVICE_TERM/);
  assert.match(api, /contract.VerifiedAt is null/);
  assert.match(api, /access.CanManageOrganization/);
});

test('KC-01 accounting UI reads Sales-verified service dates and keeps financial actions unchanged', () => {
  const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  for(const key of ['service_start_on','service_end_on','payment_cycle','protection_until']) {
    assert.ok(ui.includes(key), key);
  }
  assert.match(ui, /Chưa cập nhật/);
  assert.match(ui, /channel_sales.revenue.record/);
  assert.doesNotMatch(ui, /Ghi nhận thời hạn theo hợp đồng/);
  const sales = read('src/components/crm/channel-sales-view.tsx');
  assert.match(sales, /service_start_on: serviceStartOn/);
  assert.match(sales, /service_end_on: serviceEndOn/);
  assert.match(sales, /payment_cycle: paymentCycle/);
  assert.match(ui, /Thêm khoản thu/);
  assert.match(ui, /Hoa hồng Sales/);
  assert.doesNotMatch(ui, /\/contract-lifecycle\/terms/);
});

test('KC-01 migration does not backfill or alter historic 9-month prices, policies or protected ownership', () => {
  const migration = read('../backend/src/KidsfitCRM.Api/Infrastructure/Migrations/20261106090000_AccountingContractServiceTerm.cs');
  for(const key of ['service_start_on','service_end_on','payment_cycle']) {
    assert.match(migration, new RegExp(key));
  }
  assert.doesNotMatch(migration, /UPDATE sales_contracts|revenue_schedules|commission_ledger_entries|customer_protections/i);
});

test('KC-01 selects exactly one payment plan and derives its billing cycle in both Sales forms', () => {
  const mapping = read('src/lib/contract-payment-plan.ts');
  const initial = read('src/components/crm/channel-sales-view.tsx');
  const revision = read('src/components/roles/SalesContractRevisions.tsx');
  for (const source of [initial, revision]) {
    assert.match(source, /paymentCycleForPlan\(plan\)/);
    assert.match(source, /payment_cycle: paymentCycle/);
    assert.match(source, /Gói dịch vụ & hình thức thanh toán/);
    assert.doesNotMatch(source, /Chu kỳ thanh toán \*/);
    assert.doesNotMatch(source, /setPaymentCycle/);
  }
  assert.match(mapping, /plan === 'MONTHLY_9' \? 'MONTHLY' : 'YEARLY'/);
  const validation = read('src/lib/contract-validation.ts');
  assert.match(validation, /Chu kỳ thanh toán không khớp gói dịch vụ/);
});

test('KC-01 backend validates the plan-cycle pairing without changing installment schedules', () => {
  const contracts = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesContracts.cs');
  const initial = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesActions.cs');
  const revision = read('../backend/src/KidsfitCRM.Api/Features/ManagerContractEndpoints.cs');
  assert.match(contracts, /ContractServicePlanPolicy/);
  assert.match(initial, /ContractServicePlanPolicy.RequireMatchingCycle\(request.ServicePlan, cycle\)/);
  assert.match(revision, /ContractServicePlanPolicy.RequireMatchingCycle\(contract.ServicePlan, contract.PaymentCycle\)/);
  assert.match(initial, /Payment schedules are created by Accounting/);
});

test('KC-01 Accounting separates signed original term from the currently active period', () => {
  const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  const backend = read('../backend/src/KidsfitCRM.Api/Features/AccountingContractEndpoints.cs');
  for (const key of ['source_service_start_on', 'source_service_end_on', 'source_payment_cycle']) {
    assert.ok(ui.includes('detail.data.' + key), key);
    assert.ok(backend.includes(key + ' = c.'), key);
  }
  // KC-02 history now appears once in the unified inline renewal section,
  // not duplicated below the original contract fields.
  const renewal = read('src/screens/Accounting/Contracts/AccountingRenewalInline.tsx');
  assert.ok(renewal.includes('Tái ký lần'));
  assert.ok(renewal.includes('service_start_on'));
  assert.ok(renewal.includes('service_end_on'));
  assert.doesNotMatch(ui, /Kỳ sử dụng và tái ký đã xác nhận/);
  assert.ok(ui.includes('Kỳ tiếp theo: {channelDate(row.next_service_start_on)}'));
  assert.ok(!ui.includes("detail.current_period?channelDate(detail.current_period.start_on):'Không có kỳ đang sử dụng'"));
});
