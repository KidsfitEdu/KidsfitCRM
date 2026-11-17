import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
const shared=readFileSync(resolve(import.meta.dirname,'../src/components/common/app-select.tsx'),'utf8');

test('central payout selection uses eligible contract and beneficiary scope',()=>{
  assert.match(page,/const openCentralPayout=/);
  assert.match(page,/setCentralPayoutIntent\(intent\)/);
  assert.match(page,/setSelected\(intent\.contractId\)/);
  assert.match(page,/setPayoutBeneficiary\(intent\.role\+':'\+intent\.beneficiaryUserId\)/);
  assert.match(page,/setPayoutPeriod\(intent\.period\)/);
  assert.match(page,/const openDraft =/);
  assert.match(shared,/aria-label=\{ariaLabel\}/);
});
test('commission period is formatted for display without changing period submitted to API',()=>{
  assert.match(page,/const payoutPeriodLabel = \(period: string\)/);
  assert.match(page,/const match = \/\^\(\\d\{4\}\)-\(\\d\{2\}\)\$\//);
  assert.match(page,/Tháng \$\{match\[2\]\}\/\$\{match\[1\]\}/);
  assert.match(page,/value:period,label:/);
  assert.match(page,/eligibleByPeriod\.get\(period\)/);
  assert.match(page,/period:chosenPeriod/);
});
test('draft payout actions remain permission guarded in the central payout detail dialog',()=>{
  assert.match(page,/payoutPreview\.status==='DRAFT'/);
  assert.match(page,/canCreatePayout/);
  assert.match(page,/mode:'EDIT'/);
  assert.match(page,/mode:'COMPLETE'/);
  assert.match(page,/submitPayout\(id\)/);
  assert.match(page,/approvePayout\(id\)/);
  assert.match(page,/setReturningPayoutId\(payoutPreview\.id\)/);
});
