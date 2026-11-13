import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
const shared=readFileSync(resolve(import.meta.dirname,'../src/components/common/app-select.tsx'),'utf8');

test('payout selectors reuse accessible app selects with matching height and balanced layout',()=>{
  assert.match(page,/id="accounting-payout-beneficiary" ariaLabel="Người hưởng hoa hồng"/);
  assert.match(page,/id="accounting-payout-period" ariaLabel="Kỳ hoa hồng để lập phiếu chi"/);
  assert.match(page,/sm:grid-cols-2 lg:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)_auto\]/);
  assert.match(page,/value=\{currentBeneficiary\?\.key\?\?''\}/);
  assert.match(page,/onValueChange=\{value=>\{setPayoutBeneficiary\(value\);setPayoutPeriod\(''\);payoutKey\.current=null;\}\}/);
  assert.match(page,/onValueChange=\{setPayoutPeriod\}/);
  assert.match(shared,/!h-10 min-w-0/);
  assert.doesNotMatch(page,/<select aria-label="Người hưởng hoa hồng"/);
  assert.doesNotMatch(page,/<select aria-label="Kỳ hoa hồng để lập phiếu chi"/);
});
test('commission period is formatted for display without changing period submitted to API',()=>{
  assert.match(page,/const payoutPeriodLabel = \(period: string\)/);
  assert.match(page,/const match = \/\^\(\\d\{4\}\)-\(\\d\{2\}\)\$\//);
  assert.match(page,/Tháng \$\{match\[2\]\}\/\$\{match\[1\]\}/);
  assert.match(page,/value:period,label:/);
  assert.match(page,/eligibleByPeriod\.get\(period\)/);
  assert.match(page,/period:chosenPeriod/);
});
test('draft payout actions become accessible icon-only controls but retain existing authorization and handlers',()=>{
  assert.match(page,/AdminIconAction icon=\{Pencil\} tone="neutral" disabled=\{saving\}/);
  assert.match(page,/label=\{\x60Sửa phiếu nháp \$\{x\.code\}\x60\} onClick=\{\(\)=>openDraft\(x\)\}/);
  assert.match(page,/AdminIconAction icon=\{Send\} tone="green" disabled=\{saving\}/);
  assert.match(page,/onClick=\{\(\)=>void submitPayout\(x\.id\)\}/);
  assert.match(page,/\(x\.status==='DRAFT'\|\|x\.status==='CHANGES_REQUESTED'\)&&canCreatePayout/);
  assert.match(shared,/aria-label=\{ariaLabel\}/);
});
