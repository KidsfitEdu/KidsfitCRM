import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const read=p=>readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const picker=read('src/screens/Accounting/Contracts/AccountingReceivablePicker.tsx');
const api=read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');

test('Receipt entry displays every form field from the start and keeps search inline',()=>{
  assert.ok(page.includes('<AccountingReceivablePicker'));
  assert.ok(page.includes('id="accounting-financial-transaction-form"'));
  assert.ok(page.includes('disabled={!receiptReady}'));
  for(const label of ['Nhà trường / Hợp đồng *','Đợt thanh toán *','Ngày giao dịch *',
    'Số tiền nhà trường thực trả (VNĐ) *','Mã giao dịch ngân hàng *','Ảnh chứng từ chuyển khoản *'])
    assert.ok(page.includes(label),label);
  assert.ok(page.includes('space-y-2'));
  assert.doesNotMatch(page,/Thay đổi<\/AppButton>/);
});
test('School search lives in a portal with a single input rather than an expanding form',()=>{
  assert.ok(picker.includes('<PopoverContent'));
  assert.ok(picker.includes('id="receivable-contract-search"'));
  assert.ok(picker.includes('id="receivable-contract-options"'));
  assert.ok(picker.includes('onKeyDown='));
  assert.ok(picker.includes('onSelect(item)'));
  assert.ok(picker.includes('max-h-[min(288px,45dvh)]'));
});
test('Contract change protects entered payment fields while retaining assigned people',()=>{
  for(const part of ['receiptProofSelected','pendingReceivable','<ConfirmDialog',
    'requestSelectReceivable','setReceivableChoice(item)','setSelected(item.id)',
    'receiptAttempt.current=null','setAmountInput(\'\')'])
    assert.ok(page.includes(part),part);
  assert.ok(page.includes('receivableChoice?.owner_name'));
  assert.ok(page.includes('receivableChoice?.manager_name'));
  assert.ok(api.includes('manager_name = (from membership in db.OrganizationMemberships'));
});
test('Receipt submission retains authorized, idempotent financial API with proof checks',()=>{
  for(const part of ['revenue_schedule_id:scheduleId','idempotency_key:attempt.key',
    "method:'POST',body:attachment","if (Object.keys(validation).length)"])
    assert.ok(page.includes(part),part);
  assert.ok(page.includes('disabled={saving||!receiptReady}'));
  assert.ok(page.includes('onSubmit={event=>void sendRecord(event)}'));
});
