import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('Accounting hides the redundant GI-01 explanatory copy but retains protection status and history', () => {
  const accounting = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.doesNotMatch(accounting, /Đủ hoặc quá 12 tháng không đồng nghĩa đã hết bảo vệ/);
  assert.doesNotMatch(accounting, /Kế toán không tự kết thúc hoặc cấp quyền bảo vệ/);
  assert.match(accounting, /Tình trạng dịch vụ & quyền bảo vệ/);
  assert.match(accounting, /Quyền bảo vệ Sales:/);
  assert.match(accounting, /Lịch sử xử lý gián đoạn \(GI-01\)/);
});

test('Accounting receipt and payout share the Sales currency input, with raw digit values in state', () => {
  const accounting = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  const currency = read('src/components/common/inputs/app-currency-input.tsx');
  assert.match(accounting, /import \{ AppCurrencyInput \} from '@\/components\/common\/inputs\/app-currency-input'/);
  assert.match(accounting, /<AppCurrencyInput id="accounting-amount" name="amount"/);
  assert.match(accounting, /onValueChange=\{setAmountInput\}/);
  assert.match(accounting, /entryMode==='receipt'\?'Số tiền nhà trường thực trả/);
  assert.match(accounting, /'Số tiền đã chuyển \(VNĐ\)/);
  assert.match(accounting, /setAmountInput\(String\(detail\.payouts\.find/);
  assert.doesNotMatch(accounting, /onChange=\{e=>setAmountInput\(formatMoneyInput/);
  assert.match(accounting, /const amount = parseMoneyInput\(amountInput\)/);
  assert.match(accounting, /Number\.isSafeInteger\(amount\) \|\| amount <= 0/);
  assert.match(accounting, /aria-invalid=\{Boolean\(fieldErrors\.amount\)\}/);
  assert.match(accounting, />đ<\/span>/);
  assert.match(currency, /value=\{focused \? value : formatted\}/);
  assert.match(currency, /setFocused\(true\)/);
  assert.match(currency, /setFocused\(false\)/);
  assert.match(currency, /event\.currentTarget\.value\.replace\(\/\[\^0-9\]\/g, ''\)/);
});

test('Vietnamese grouping is only presented outside the input focus state', () => {
  const format = digits => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  for (const [raw, afterBlur] of [
    ['690000', '690.000'],
    ['6900000', '6.900.000'],
    ['690', '690'],
    ['', ''],
  ]) {
    assert.equal(raw, raw);
    assert.equal(format(raw), afterBlur);
    assert.equal(Number(raw.replace(/\./g, '')), raw ? Number(raw) : 0);
  }
});
