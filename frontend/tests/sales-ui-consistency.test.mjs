import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test('Sales dashboard uses shared branded list and edit action styling', () => {
  const source = read('src/components/roles/SalesDashboard.tsx');
  assert.match(source, /<AdminListPanel>/);
  assert.match(source, /adminTableHeadClass/);
  assert.match(source, /<AdminIconAction icon=\{SquarePen\} tone="blue"/);
  assert.match(source, /onClick=\{\(\)=>go\('role-sales-staff-activities'\)\}/);
});

test('Sales proposal list distinguishes actions and workflow statuses', () => {
  const source = read('src/components/roles/SalesProposalTable.tsx');
  assert.match(source, /<SalesListLayout/);
  assert.match(source, /<AppStatusBadge/);
  assert.match(source, /PENDING_MANAGER: 'warning'/);
  assert.match(source, /APPROVED: 'success'/);
  assert.match(source, /REJECTED: 'danger'/);
  assert.match(source, /icon=\{Pencil\} tone="blue"/);
  assert.match(source, /icon=\{Trash2\} tone="red"/);
});

test('Sales invitation list represents actionable states with semantic badges', () => {
  const source = read('src/components/roles/SalesInvitationList.tsx');
  assert.match(source, /<AppStatusBadge size="sm"/);
  assert.match(source, /PENDING: 'warning'/);
  assert.match(source, /ACCEPTED: 'success'/);
  assert.match(source, /REJECTED: 'danger'/);
  assert.match(source, /x\.is_expired \? 'danger'/);
  assert.match(source, /onAccept\(x\)/);
  assert.match(source, /onReject\(x\)/);
});

test('Sales income overview uses shared stat cards without changing API values', () => {
  const source = read('src/components/roles/SalesIncomePage.tsx');
  assert.match(source, /<AppStatCard icon=\{Wallet\}/);
  assert.match(source, /data\?\.summary\.accrued/);
  assert.match(source, /data\?\.summary\.paid/);
  assert.match(source, /data\?\.summary\.unpaid/);
  assert.match(source, /data\?\.summary\.contracts/);
});

test('Sales customer state colors distinguish approach, pending review, and verification', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  assert.match(source, /APPROACHING:[\s\S]*?border-sky-200/);
  assert.match(source, /'Chờ Quản lý duyệt', compact: 'Hồ sơ đã gửi', className: amber/);
  assert.match(source, /'Chờ CHECKEE xác minh', compact: 'CHECKEE đang xử lý', className: amber/);
});
