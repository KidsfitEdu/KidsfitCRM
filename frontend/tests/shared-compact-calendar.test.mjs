import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const datePicker=read('src/components/common/forms/app-date-picker.tsx');
const monthPicker=read('src/components/common/forms/app-month-picker.tsx');
const accounting=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const backend=read('../backend/src/KidsfitCRM.Api/Features/Accounting/Payouts/AccountingPayoutEndpoints.cs');

test('Shared date picker remains compact without replacing its date-only contract',()=>{
  assert.match(datePicker,/w-\[min\(250px,calc\(100vw-24px\)\)\]/);
  assert.match(datePicker,/\[--cell-size:1\.75rem\]/);
  assert.match(datePicker,/format\(date,'yyyy-MM-dd'\)/);
  assert.match(datePicker,/locale=\{vi\}/);
});

test('Month-year picker uses a compact common popover and distinct YYYY-MM model',()=>{
  assert.match(monthPicker,/function AppMonthPicker/);
  assert.match(monthPicker,/w-\[min\(250px,calc\(100vw-24px\)\)\]/);
  assert.match(monthPicker,/role|aria-label=\{label\}/);
  assert.match(monthPicker,/Tất cả thời gian/);
  assert.match(monthPicker,/onChange\(`\$\{viewYear\}-\$\{String\(m\)\.padStart\(2,'0'\)\}`\)/);
  assert.match(accounting,/value=\{financeCreatedMonth\}/);
});

test('Accounting creation-month filter and ledger source period remain separate',()=>{
  assert.match(accounting,/params\.set\('year',financeCreatedMonth\.slice\(0,4\)\)/);
  assert.match(accounting,/params\.set\('month',String\(Number\(financeCreatedMonth\.slice\(5,7\)\)\)\)/);
  assert.match(accounting,/setPayoutCreatePeriod\(candidate\.period\)/);
  assert.match(backend,/x\.CreatedAt >= from && x\.CreatedAt < to/);
  assert.match(backend,/x\.Period == commissionPeriod/);
  assert.match(backend,/entries\.Where\(x => x\.Period == commissionPeriod\)/);
});
