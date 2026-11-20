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
  assert.match(picker, /max-h-\[min\(\d+px,45dvh\)\]/);
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

test('School picker closes after selection without focus-triggered reopening',()=>{
  assert.ok(picker.includes('onSelect(item);'));
  assert.ok(picker.includes('onOpenChange(false);'));
  assert.doesNotMatch(picker,/onFocus=\{\(\)=>\{if\(!open/);
});
test('Receipt schedule uses branded, portaled select rather than native blue options',()=>{
  assert.ok(page.includes('<Select name="schedule_id"'));
  assert.ok(page.includes('<SelectTrigger id="receipt-schedule"'));
  assert.ok(page.includes('<SelectContent align="start" alignItemWithTrigger={false}'));
  assert.ok(page.includes('side="bottom" sideOffset={6} listClassName="space-y-1"'));
  assert.ok(page.includes('w-(--anchor-width) max-h-[min(224px,40dvh)]'));
  assert.ok(page.includes('data-selected:bg-primary/10 data-selected:text-primary'));
  assert.ok(page.includes('<SelectItem'));
  assert.ok(page.includes('onValueChange={value=>'));
  assert.doesNotMatch(page,/<select id="receipt-schedule"/);
  assert.ok(page.includes("receiptAttempt.current=null;setFieldErrors({})"));
});
test('Receipt evidence uses the minimal upload card with a real form file input',()=>{
  const upload=read('src/screens/Accounting/Contracts/AccountingReceiptProofUpload.tsx');
  assert.ok(page.includes('<AccountingReceiptProofUpload disabled={!receiptReady}'));
  assert.ok(upload.includes('id="accounting-bank-proof" name="proof" type="file" required'));
  assert.ok(upload.includes('Chọn ảnh chứng từ'));
  assert.ok(upload.includes('JPG, PNG, WEBP · Tối đa 5 MB'));
  assert.ok(upload.includes('onFileSelected(true)'));
  assert.ok(upload.includes('onFileSelected(false)'));
  assert.ok(upload.includes('inputRef.current.value='));
  assert.ok(upload.includes('newFile.size>MAX_PROOF_SIZE'));
  assert.ok(upload.includes('ALLOWED_TYPES.includes(newFile.type)'));
  assert.ok(upload.includes('Thay ảnh'));
  assert.ok(upload.includes('Xóa ảnh'));
});
