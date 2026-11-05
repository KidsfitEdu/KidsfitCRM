import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('All operational workspaces reuse scoped renewal explorer without copying authorization', () => {
  const paths = [
    'src/screens/Accounting/Contracts/AccountingContractsPage.tsx',
    'src/screens/SalesManager/Contracts/ContractsPage.tsx',
    'src/screens/CustomerCare/Customers/CustomersPage.tsx',
    'src/components/roles/RoleOperationsPage.tsx',
  ];
  for (const path of paths) assert.match(read(path), /ContractLifecycleExplorer/);
  const shared = read('src/components/crm/contract-lifecycle-explorer.tsx');
  assert.match(shared, /contract-lifecycle\/contracts/);
  assert.match(shared, /contract-lifecycle\/terms/);
  assert.match(shared, /mode==='sales'/);
  assert.match(shared, /mode==='manager'/);
  assert.match(shared, /mode==='checkee'/);
  assert.match(shared, /appNotice\.error/);
});

test('Header includes lifecycle unread notices without replacing existing proposal alerts', () => {
  const header = read('src/components/layout/Header.tsx');
  assert.match(header, /\/notifications'/);
  assert.match(header, /contract-lifecycle\/alerts/);
  assert.match(header, /contract-lifecycle\/alerts\/.*\/read/);
  assert.match(header, /unreadCount/);
  assert.match(header, /SERVICE_EXPIRING_30/);
  assert.match(header, /INTERRUPTED_12M/);
});

test('Renewal permissions and financial protection remain enforced on server', () => {
  const api = read('../backend/src/KidsfitCRM.Api/Features/ContractServiceLifecycleEndpoints.cs');
  assert.match(api, /SchoolContractReview/);
  assert.match(api, /ChannelSalesReconcile/);
  assert.match(api, /CustomerProtections\.AnyAsync/);
  assert.match(api, /PENDING_MANAGER/);
  assert.match(api, /PENDING_CHECKEE/);
  const sweep = read('../backend/src/KidsfitCRM.Api/Infrastructure/ContractLifecycleSweep.cs');
  assert.match(sweep, /INSERT IGNORE INTO contract_lifecycle_alerts/);
  assert.match(sweep, /BeginTransactionAsync\(IsolationLevel\.ReadCommitted/);
  assert.match(sweep, /SchoolDisputes\.AnyAsync/);
  assert.match(sweep, /ReconciliationCases\.AnyAsync/);
  assert.doesNotMatch(sweep, /DELETE FROM|RevenueReceipts\.Remove|CommissionLedgerEntries\.Remove/);
});
