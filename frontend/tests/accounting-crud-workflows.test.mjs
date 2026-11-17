import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const renewal=read('src/screens/Accounting/Contracts/AccountingRenewalInline.tsx');
const payoutApi=read('../backend/src/KidsfitCRM.Api/Features/AccountingPayoutEndpoints.cs');
const draftApi=read('../backend/src/KidsfitCRM.Api/Features/AccountingReceiptDraftEndpoints.cs');

test('Payout list and eligible chooser use authorized server pagination and row permissions',()=>{
  assert.match(page,/\/accounting\/payouts\?/);
  assert.match(page,/\/accounting\/eligible-payouts\?/);
  assert.match(page,/total=\{payoutTotal\}/);
  assert.match(page,/eligiblePage\*20>=eligibleTotal/);
  assert.match(page,/p\.can_edit/);
  assert.match(page,/payoutPreview\.can_approve/);
  assert.match(page,/payoutPreview\.can_complete/);
  assert.doesNotMatch(page,/financeOverview\?\.payouts/);
  assert.match(payoutApi,/access\.Payouts\(db\)/);
  assert.match(payoutApi,/Skip\(\(pn - 1\) \* size\)\.Take\(size\)/);
  assert.match(payoutApi,/can_edit = canEdit/);
  assert.match(payoutApi,/x\.CreatedByUserId == access\.UserId/);
  assert.match(payoutApi,/var events = await db\.PayoutEvents/);
});

test('Receipt selection and transaction details are in one dialog',()=>{
  assert.match(page,/open=\{receiptIntent\}/);
  assert.match(page,/entryMode==='receipt'&&detail\?financialTransactionForm/);
  assert.match(page,/const financialTransactionForm=detail&&entryMode/);
  assert.doesNotMatch(page,/open=\{Boolean\(detail && entryMode\)\}/);
  assert.match(page,/setReceiptIntent\(true\)/);
  assert.match(page,/setSelected\(item\.id\)/);
});

test('Receipt draft actions do not mutate the ledger until posting with evidence',()=>{
  for(const term of ['/accounting/receipt-drafts','/cancel','/post','editingReceiptDraft',
    'setReceiptAppliedStatus','saveReceiptDraft','cancelReceiptDraft'])
    assert.ok(page.includes(term),term);
  assert.match(page,/status=\{receipt\.status\}/);
  assert.match(page,/tone="blue" label=\{'Sửa khoản thu nháp '/);
  assert.match(page,/tone="red" label=\{'Hủy khoản thu nháp '/);
  assert.match(draftApi,/draft\.Status = "POSTED"/);
  assert.match(draftApi,/draft\.Status = "CANCELLED"/);
  assert.match(draftApi,/RecordRevenueReceipt\(draft\.ContractId/);
  assert.match(draftApi,/new RecordRevenueReceiptRequest\("ACCOUNTING-DRAFT-" \+ draft\.Id/);
  assert.match(draftApi,/CreatedByUserId == access\.UserId/);
});

test('Renewal row actions target the correct renewal and explicit review decision',()=>{
  assert.match(page,/openRenewal\(row\.id,period\.id,'view'\)/);
  assert.match(page,/openRenewal\(row\.id,period\.id,'confirm'\)/);
  assert.match(page,/openRenewal\(row\.id,period\.id,'request-info'\)/);
  assert.match(page,/focusRenewalId=\{focusedRenewal\?\.id\}/);
  assert.match(renewal,/focusAction==='confirm'/);
  assert.match(renewal,/focusAction==='request-info'/);
  assert.match(renewal,/detail\.data\.id!==focusRenewalId/);
});
