import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { contractSignedDay, validateTransactionDay } from '../src/lib/accounting-transaction-date.ts';

const source = readFileSync(resolve(import.meta.dirname, '../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'), 'utf8');

test('DateOnly is compared directly without UTC/local calendar conversion', () => {
  assert.equal(contractSignedDay('2026-11-12'), '2026-11-12');
  assert.equal(contractSignedDay('2026-11-12T00:00:00'), '2026-11-12');
  assert.equal(contractSignedDay('2026-11-12T00:00:00Z'), '2026-11-12');
  assert.equal(contractSignedDay('11/12/2026'), null);
  assert.doesNotMatch(source, /accountingBusinessDay\(new Date\(detail\.data\.signed_on\)\)/);
  assert.match(source, /contractSignedDay\(detail\.data\.signed_on\)/);
});

test('Receipt accepts signed date, rejects previous day, and disallows future days', () => {
  const today = '2026-11-12', signed = '2026-11-12';
  assert.equal(validateTransactionDay(signed, today, signed, 'receipt'), undefined);
  assert.equal(validateTransactionDay('2026-11-11', today, signed, 'receipt'),
    'Ngày thu không được trước ngày ký hợp đồng.');
  assert.equal(validateTransactionDay('2026-11-13', today, signed, 'receipt'),
    'Ngày giao dịch không được lớn hơn ngày hiện tại.');
  assert.equal(validateTransactionDay('', today, signed, 'receipt'), 'Vui lòng chọn ngày giao dịch.');
});

test('Payout is independent of contract signed date but not allowed in future', () => {
  assert.equal(validateTransactionDay('2026-11-11','2026-11-12','2026-11-12','payout'), undefined);
  assert.equal(validateTransactionDay('2026-11-13','2026-11-12','2026-11-12','payout'),
    'Ngày giao dịch không được lớn hơn ngày hiện tại.');
});

test('Accounting page adds field error only when validation returns a message', () => {
  assert.match(source, /const dateError = validateTransactionDay\(date, today, signedOn, entryMode\)/);
  assert.match(source, /if \(dateError\) validation\.transaction_date = dateError/);
  assert.match(source, /const today = accountingBusinessDay\(new Date\(\)\)/);
  assert.match(source, /new Date\(date \+ 'T12:00:00\+07:00'\)/);
});
