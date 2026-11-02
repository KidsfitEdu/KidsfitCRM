import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, 'src', path), 'utf8');

test('Sales dashboard uses a clear task table without duplicate shortcut cards', () => {
  const source = read('components/roles/SalesDashboard.tsx');
  assert.match(source, /Lịch tư vấn sắp tới/);
  assert.match(source, /<table\s/);
  assert.doesNotMatch(source, /Lối tắt công việc/);
  assert.match(source, /onSalesNavigate/);
});

test('Sales focus keeps operational navigation and removes dashboard-only KPI cards', () => {
  const source = read('components/roles/SalesFocusPage.tsx');
  assert.doesNotMatch(source, /<AppStatCard/);
  assert.match(source, /<ChannelOperations/);
  assert.match(source, /setSubview/);
});

test('CHECKEE sections receive specific read-only display scopes while keeping reconciliation actions', () => {
  const source = read('components/crm/channel-operations.tsx');
  assert.match(source, /reconciliationView === 'disputes'/);
  assert.match(source, /reconciliationView === 'verification'/);
  assert.match(source, /reconciliationView === 'history'/);
  assert.match(source, /item\.can_reconcile/);
  assert.match(source, /<AdminListPanel/);
  assert.match(source, /item\.events\.map/);
  const role = read('components/roles/RoleOperationsPage.tsx');
  assert.match(role, /reconciliationView=/);
  assert.match(role, /<AppPageHeader/);
});

test('Admin and role dashboards use flat follow-up sections, not redundant cards', () => {
  assert.match(read('screens/Admin/Dashboard/DashboardPage.tsx'), /<section className="border-t/);
  assert.match(read('components/roles/RoleDashboard.tsx'), /<section className="border-t/);
});
