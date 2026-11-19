import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {getServicePlanLabel,paymentCycleForPlan} from '../src/lib/contract-payment-plan.ts';

const screen=readFileSync(resolve(import.meta.dirname,'../src/components/crm/channel-sales-view.tsx'),'utf8');

test('plan labels are concise and underlying billing semantics remain unchanged',()=>{
  assert.equal(getServicePlanLabel('SCHOOL_YEAR'),'Gói theo năm');
  assert.equal(getServicePlanLabel('MONTHLY_9'),'Gói hàng tháng');
  assert.equal(paymentCycleForPlan('SCHOOL_YEAR'),'YEARLY');
  assert.equal(paymentCycleForPlan('MONTHLY_9'),'MONTHLY');
  assert.equal(getServicePlanLabel('UNKNOWN'),'Chưa xác định');
});

test('contract report keeps original layout and manager-first submission copy',()=>{
  assert.match(screen,/return <SalesFormDialog title="Báo cáo hợp đồng"/);
  assert.match(screen,/Gửi Quản lý duyệt/);
  assert.doesNotMatch(screen,/subtitle="Gửi hồ sơ hợp đồng đã ký/);
  assert.match(screen,/getServicePlanLabel\(option\)/);
  assert.doesNotMatch(screen,/Gói năm học \(9 tháng, tặng 3 tháng hè\)/);
  assert.doesNotMatch(screen,/Gói hàng tháng \(9 tháng\)/);
  const form=screen.slice(screen.indexOf('function ContractDialog'),screen.indexOf('function ReceiptDialog'));
  assert.doesNotMatch(form,/1\. Thông tin hợp đồng|2\. Gói dịch vụ và quy mô|3\. Chi phí hợp đồng|4\. Hồ sơ đính kèm/);
  assert.match(form,/Chi phí theo hợp đồng/);
  assert.match(form,/CustomerHighlight customer=\{customer\}/);
});

test('contract submission still uses evidence, idempotency and existing amounts',()=>{
  assert.match(screen,/service_plan: plan/);
  assert.match(screen,/payment_cycle: paymentCycle/);
  assert.match(screen,/maintenance_fee: maintenance/);
  assert.match(screen,/setup_fee: setup/);
  assert.match(screen,/evidence_id: response\.data\.id/);
  assert.match(screen,/const multiplier = plan === 'MONTHLY_9' \? 9 : 1/);
});

test('only scoped report inputs, package choice and upload change',()=>{
  const form=screen.slice(screen.indexOf('function ContractDialog'),screen.indexOf('function ReceiptDialog'));
  assert.match(form,/\[&_input:not\(\[type=radio\]\):not\(\[type=checkbox\]\):not\(\[type=file\]\)\]:h-11/);
  assert.match(form,/min-h-\[52px\]/);
  assert.match(form,/grid grid-cols-2 gap-2/);
  assert.match(form,/border-dashed/);
  assert.match(form,/UploadCloud/);
  assert.match(form,/file \? file\.name/);
  assert.match(form,/accept="\.pdf,image\/jpeg,image\/png,image\/webp"/);
  assert.match(form,/Gửi Quản lý duyệt/);
});

test('contract report uses the shared date picker and preserves validation focus and dates',()=>{
  const form=screen.slice(screen.indexOf('function ContractDialog'),screen.indexOf('function ReceiptDialog'));
  assert.equal((form.match(/<AppDatePicker /g)||[]).length,3);
  assert.doesNotMatch(form,/type="date"/);
  for (const field of ['signed_on','service_start_on','service_end_on']) assert.match(form,new RegExp('fieldName="'+field+'"'));
  assert.match(form,/data-field="\$\{first\}"/);
  assert.match(form,/onSubmit=\{submit\} noValidate/);
  assert.match(form,/date.setUTCFullYear\(date.getUTCFullYear\(\)\+1\)/);
});
test('contract report uses an opaque anchored dialog footer and external form submit',()=>{
  const form=screen.slice(screen.indexOf('function ContractDialog'),screen.indexOf('function ReceiptDialog'));
  assert.match(form,/footer=\{<>/);
  assert.match(form,/form="sales-contract-report-form"/);
  assert.match(form,/id="sales-contract-report-form"/);
  assert.doesNotMatch(form,/<DialogFooter /);
  assert.match(screen,/footerClassName=\{footer \? 'relative z-20 bg-card/);
});

test('shared date picker uses compact Vietnamese calendar and year jump without changing ISO payload',()=>{
  const picker=readFileSync(resolve(import.meta.dirname,'../src/components/common/forms/app-date-picker.tsx'),'utf8');
  assert.match(picker,/captionLayout="label" hideNavigation/);
  assert.match(picker,/aria-label="Tháng trước"/);
  assert.match(picker,/aria-label="Tháng sau"/);
  assert.match(picker,/aria-label="Chọn nhanh tháng và năm"/);
  assert.match(picker,/aria-label="Chọn năm"/);
  assert.match(picker,/Array.from\(\{length:12\}/);
  assert.match(picker,/locale=\{vi\} weekStartsOn=\{1\}/);
  assert.match(picker,/onChange\(format\(date,'yyyy-MM-dd'\)\)/);
  assert.match(picker,/setOpen\(false\)/);
  assert.match(picker,/data-field=\{fieldName\}/);
  assert.match(picker,/aria-invalid=\{invalid\}/);
  assert.doesNotMatch(picker,/captionLayout="dropdown"/);
});
