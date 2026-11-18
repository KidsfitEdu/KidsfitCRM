import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const workspace=read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');
const renewal=read('../backend/src/KidsfitCRM.Api/Features/ContractRenewalEndpoints.cs');
const revenue=read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesActions.cs');
const model=read('../backend/src/KidsfitCRM.Api/Domain/ChannelSalesEntities.cs');

test('Accounting has three workflows with one receipt register and one payout register',()=>{
  for(const item of ["label:'Hợp đồng'","label:'Khoản thu nhà trường'","label:'Phiếu chi hoa hồng'"])
    assert.ok(page.includes(item),item);
  assert.match(page,/accountingTab==='RECEIPTS'/);
  assert.match(page,/accountingTab==='PAYOUTS'/);
  assert.match(page,/\/accounting\/receipts\?/);
  assert.match(page,/\/accounting\/receivable-contracts\?/);
  assert.match(page,/receiptRows\.map\(receipt=>/);
  assert.match(page,/receiptPreview/);
  assert.match(page,/Xem chứng từ/);
  assert.match(page,/Lập phiếu chi hoa hồng/);
  assert.doesNotMatch(page,/accounting-eligible-payouts/);
});

test('Receipt recording requires an authorized contract, installment and private proof',()=>{
  assert.match(page,/receiptIntent/);
  assert.match(page,/setSelected\(item\.id\)/);
  assert.match(page,/entryMode==='receipt'/);
  assert.match(page,/revenue_schedule_id:scheduleId/);
  assert.match(page,/attachment\.set\('kind',entryMode==='receipt'\?'RECEIPT':'PAYOUT'\)/);
  assert.match(page,/idempotency_key:attempt\.key/);
  assert.match(workspace,/MapGet\("\/accounting\/receipts", Receipts\)/);
  assert.match(workspace,/access\.Contracts\(db\)\.AsNoTracking\(\)/);
  assert.match(workspace,/receipt\.Status == "COMPLETED"/);
  assert.doesNotMatch(page,/method:'DELETE'.*revenue-receipts/);
  assert.doesNotMatch(page,/receipt-drafts|ReceiptDraft|saveReceiptDraft/);
});

test('Renewal payment schedules are period-specific and linked without mutating original value',()=>{
  assert.match(model,/public long\? ContractRenewalId/);
  assert.match(renewal,/ContractRenewalId = renewal\.Id/);
  assert.match(renewal,/installmentCount = renewal\.PaymentCycle == "MONTHLY" \? 12 : 1/);
  assert.match(revenue,/var periodValue = renewal\?\.TotalValue \?\? contract\.TotalValue/);
  assert.match(revenue,/schedule\.ContractRenewalId\.HasValue/);
  assert.match(page,/x\.renewal_no\?'Tái ký lần '/);
  assert.match(page,/row\.periods\?\.map\(period=>/);
});

test('Posted receipts remain readable and cannot be silently edited as drafts',()=>{
  assert.match(page,/Khoản thu đã ghi nhận không được sửa\/xóa trực tiếp/);
  assert.match(page,/setReceiptPreview\(receipt\)/);
  assert.match(page,/setReceiptRevision\(v=>v\+1\)/);
  assert.match(page,/canRecordRevenue/);
});
