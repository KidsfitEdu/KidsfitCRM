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
  const currencyInput = read('src/components/common/inputs/app-currency-input.tsx');
  assert.match(page, /<AppCurrencyInput id="accounting-amount"/);
  assert.match(page, /onValueChange=\{setAmountInput\}/);
  assert.match(currencyInput, /inputMode="numeric"/);
  assert.match(currencyInput, /onValueChange\(digits\.replace/);
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
  for(const label of ['Thu nhỏ ảnh', 'Phóng to ảnh', 'Vừa khung hình', 'Đóng xem chứng từ']) {
    assert.ok(viewer.includes(label), label);
  }
  assert.match(viewer, /application\/pdf/);
  assert.match(viewer, /download=\{preview\.name\}/);
});

test('Accounting schedule status is Vietnamese and progress reflects actual paid amount', () => {
  const page = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  for (const label of ['Đã thanh toán', 'Chưa thanh toán', 'Thanh toán một phần', 'Quá hạn']) {
    assert.ok(page.includes(label), label);
  }
  assert.match(page, /paymentScheduleLabel\(x.status\)/);
  assert.match(page, /Math.min\(100, paid \/ x.amount_due \* 100\)/);
  assert.doesNotMatch(page, /<div className="text-xs text-muted-foreground">\{x.status\}<\/div>/);
});

test('Accounting payout table includes approved and draft records instead of only paid payouts', () => {
  const page = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.match(page, /detail.payouts.map\(x=>/);
  assert.match(page, /payoutStatusLabel\(x.status\)/);
  assert.match(page, /x.status==='PENDING_APPROVAL'&&canApprovePayout/);
  assert.doesNotMatch(page, /Phiếu chi đang xử lý/);
  assert.doesNotMatch(page, /detail.payouts.filter\(x=>x.status==='PAID'\).map/);
  assert.match(page, /detail.ledger/);
});

test('Evidence image viewer is dark edge to edge with scroll zoom and drag', () => {
  const viewer = read('src/components/common/evidence-preview-dialog.tsx');
  assert.match(viewer, /bg-\[#191d22\]/);
  assert.match(viewer, /onWheel=\{onWheelZoom\}/);
  assert.match(viewer, /onPointerDown=\{beginDrag\}/);
  assert.match(viewer, /onPointerMove=\{moveDrag\}/);
  assert.match(viewer, /aria-label="Phóng to ảnh"/);
  assert.doesNotMatch(viewer, /bg-muted\/30 p-3 sm:p-5/);
});
