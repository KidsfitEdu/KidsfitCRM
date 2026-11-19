import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const renewal=read('src/screens/Accounting/Contracts/AccountingRenewalInline.tsx');
const payoutApi=read('../backend/src/KidsfitCRM.Api/Features/AccountingPayoutEndpoints.cs');

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
  assert.match(page,/<AccountingReceivablePicker/);
  assert.match(page,/disabled=\{!receiptReady\}/);
  assert.match(page,/const financialTransactionForm=detail&&entryMode/);
  assert.doesNotMatch(page,/open=\{Boolean\(detail && entryMode\)\}/);
  assert.match(page,/setReceiptIntent\(true\)/);
  assert.match(page,/setSelected\(item\.id\)/);
});

test('Receipt recording uses existing endpoint without draft persistence',()=>{
  assert.match(page,/\/contracts\/\$\{selected\}\/revenue-receipts/);
  assert.match(page,/idempotency_key:attempt\.key/);
  assert.match(page,/evidence_id:attempt\.evidenceId/);
  assert.match(page,/\/accounting\/receipts\?/);
  assert.doesNotMatch(page,/receipt-drafts|ReceiptDraft|saveReceiptDraft|cancelReceiptDraft/);
  assert.doesNotMatch(page,/Lưu nháp.*Ghi nhận khoản thu|Hủy Nháp|Sửa khoản thu nháp/);
  assert.match(page,/<AppDrawer open=\{receiptPreview!==null\}/);
  assert.doesNotMatch(page,/commission-backfill/);
});

test('Renewal table opens the selected period only for view; decisions remain within detail',()=>{
  const tree=read('src/screens/Accounting/Contracts/AccountingContractTreeTable.tsx');
  const detail=read('src/screens/Accounting/Contracts/AccountingContractDetailContent.tsx');
  assert.ok(page.includes('onView={(contractId,renewalId)=>openContract(contractId,renewalId)}'));
  assert.ok(page.includes('setSelectedPeriodId(renewalId);setSelected(id)'));
  assert.ok(detail.includes('focusRenewalId={selectedPeriodId}'));
  assert.ok(tree.includes('onView(row.id,p.renewalId)'));
  assert.doesNotMatch(tree,/onReview|onRequestInfo|CheckCircle2|FilePenLine/);
  assert.match(renewal,/onClick=\{\(\)=>openDecision\('confirm'\)\}/);
  assert.match(renewal,/onClick=\{\(\)=>openDecision\('request-info'\)\}/);
  assert.match(renewal,/detail\.data\.id!==focusRenewalId/);
});
