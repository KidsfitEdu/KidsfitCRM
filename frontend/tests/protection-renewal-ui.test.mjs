import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('SL-02/MG-01 protection renewal uses standard CRM table and filter components', () => {
  const ui=read('src/components/crm/ProtectionRenewalPanel.tsx');
  for (const name of ['AdminListPanel','AdminListToolbar','AdminStatusBadge','AdminIconAction',
      'AppNativeSelect','AppPagination','AppDrawer','ConfirmDialog']) assert.match(ui,new RegExp(name));
  assert.match(ui, /adminTableHeadClass/);
  assert.match(ui, /className="overflow-x-auto"/);
  assert.match(ui, /aria-label="Lọc trạng thái hồ sơ"/);
  assert.match(ui, /aria-label="Lọc nguồn hồ sơ"/);
  assert.match(ui, /aria-label="Tổng hợp hồ sơ bảo vệ"/);
  assert.match(ui, /onPageSizeChange=\{size=>/);
  assert.doesNotMatch(ui, /window\.prompt|window\.confirm/);
});

test('Sales can request review, KIDSFIT manager sees approve and reject with confirmation', () => {
  const ui=read('src/components/crm/ProtectionRenewalPanel.tsx');
  assert.match(ui, /mode==='sales'&&row\.canRequest/);
  assert.match(ui, /mode==='manager'&&row\.canApprove/);
  assert.match(ui, /activeDecision\?\.action==='approve'/);
  assert.match(ui, /activeDecision\?\.action==='reject'/);
  assert.match(ui, /Vui lòng nhập lý do từ chối/);
  assert.match(ui, /15 ngày không phải gia hạn hợp đồng hoặc tự động cấp 5 năm/);
  assert.match(ui, /renewalConfirmed:\s*e\?\.renewal_confirmed/);
  assert.match(ui, /status=\{row\.renewalConfirmed\?'APPROVED':'WAITING_RENEWAL'\}/);
});

test('SL-02 role entry points remain embedded in existing Sales and Manager sections', () => {
  const sales=read('src/components/roles/SalesFocusPage.tsx');
  const manager=read('src/screens/SalesManager/Contracts/ContractsPage.tsx');
  const ctv=read('src/screens/Collaborator/CollaboratorWorkspace.tsx');
  assert.match(sales, /subview==='protection'/);
  assert.match(manager, /<ProtectionRenewalPanel apiBase=\{apiBase\} token=\{token\} mode="manager"/);
  assert.match(ctv, /<ProtectionRenewalPanel apiBase=\{props\.apiBase\} token=\{props\.token\} mode="sales"/);
});
