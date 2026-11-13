import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const read = path => readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const actions = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesActions.cs');
const finance = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesFinanceActions.cs');
const endpoint = read('../backend/src/KidsfitCRM.Api/Features/AccountingContractEndpoints.cs');
const evidence = read('../backend/src/KidsfitCRM.Api/Features/FinancialEvidenceEndpoints.cs');
test('Receipt validates balance and reuses submitted identity for a retry',()=>{
  assert.ok(ui.includes('amount>schedule.amount_due-schedule.amount_received'));
  assert.ok(ui.includes('receiptAttempt.current?.signature!==signature'));
  assert.ok(ui.includes('timestamp:accountingTransactionTimestamp(date)'));
  assert.ok(ui.includes('idempotency_key:attempt.key'));
  assert.ok(ui.includes('attempt.evidenceId===null'));
  assert.ok(actions.includes('ApiValidationException.For("reference_code"'));
});
test('Temporary proofs may be removed only by their uploader while unattached',()=>{
  assert.ok(ui.includes("method:'DELETE'"));
  assert.ok(ui.includes('[400,404,409,422].includes(cause.status)'));
  assert.ok(evidence.includes('x.UploadedByUserId == actorId'));
  assert.ok(evidence.includes('UploadedByUserId == actorId'));
  assert.ok(evidence.includes('x.AttachedAt == null && x.RevenueReceiptId == null'));
});
test('Payout previews amount, withholding and approval process',()=>{
  assert.ok(ui.includes('title="Lập phiếu chi hoa hồng"'));
  assert.ok(ui.includes('setPayoutDialogOpen(true)'));
  assert.ok(ui.includes('withholding_amount:withholding'));
  assert.ok(ui.includes('Xác nhận lập phiếu'));
  assert.ok(finance.includes('Status = "DRAFT"'));
  assert.ok(finance.includes('if (payout.Status != "APPROVED")'));
  assert.ok(ui.includes('amount!==payout.net_amount'));
});
test('Contract-scoped payout evidence and net receipts are shown',()=>{
  assert.ok(endpoint.includes('payoutIds.Contains(x.PayoutId.Value)'));
  assert.ok(endpoint.includes('refunded_total = refundedTotal'));
  assert.ok(ui.includes('detail.refunded_total??0'));
});
