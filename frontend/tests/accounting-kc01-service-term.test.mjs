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
