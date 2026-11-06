import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('Accounting detail groups summary, service terms, payment schedule, receipts and commissions', () => {
  const page = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  for (const label of ['Thông tin hợp đồng', 'Lịch thanh toán theo hợp đồng',
    'Nhà trường thanh toán', 'Hoa hồng Sales']) {
    assert.ok(page.includes(label), label);
  }
  assert.match(page, /rounded-xl border border-border\/70 bg-card p-4 shadow-sm/);
  assert.match(page, /current_period/);
  assert.match(page, /next_confirmed_period/);
});

test('Accounting money inputs show VND separators and submit an integer, not the displayed string', () => {
  const shared = read('src/lib/channel-operations.ts');
  const page = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.match(shared, /export const formatMoneyInput/);
  assert.match(shared, /export const parseMoneyInput/);
  assert.match(shared, /replace\(\/\\D\/g, ''\)/);
  assert.match(page, /formatMoneyInput\(e\.target\.value\)/);
  assert.match(page, /inputMode="numeric"/);
  assert.match(page, /parseMoneyInput\(amountInput\)/);
  assert.match(page, /Number\.isSafeInteger\(amount\)/);
  assert.doesNotMatch(page, /amount: Number\(form\.get\('amount'\)\)/);
});

test('Authenticated evidence preview has no brand header and offers magnifier, shrink, reset', () => {
  const page = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  const viewer = read('src/components/common/evidence-preview-dialog.tsx');
  assert.match(page, /<EvidencePreviewDialog preview=\{preview\} onClose=\{closePreview\}/);
  assert.doesNotMatch(page, /<AppDialog open=\{preview!==null\}/);
  assert.match(viewer, /DialogContent showCloseButton=\{false\}/);
  assert.doesNotMatch(viewer, /bg-\[#1b5e20\]/);
  for(const label of ['Thu nhỏ ảnh', 'Phóng to ảnh', 'Đặt lại kích thước ảnh', 'Đóng xem chứng từ']) {
    assert.ok(viewer.includes(label), label);
  }
  assert.match(viewer, /application\/pdf/);
  assert.match(viewer, /download=\{preview\.name\}/);
});
