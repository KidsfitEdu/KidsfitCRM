import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const source = path => readFileSync(resolve(import.meta.dirname,'../src/components/',path),'utf8');
const panel=source('roles/ContractRenewalSalesPanel.tsx');
const combobox=source('common/app-search-combobox.tsx');
const form=panel.slice(panel.indexOf("<AppDialog open={drawer==='create'"),panel.indexOf('    </AppDialog>')+17);

test('both create and resubmit use shared dialog, fixed footer and untouched API payload',()=>{
  assert.match(form,/<AppDialog open=\{drawer==='create'\|\|drawer==='resubmit'\}/);
  assert.match(form,/footer=\{<>/);
  assert.match(form,/form="kc02-sales-renewal-form"/);
  assert.match(form,/Gửi Kế toán xác nhận/);
  assert.match(form,/Gửi bổ sung/);
  assert.match(panel,/\/renewals\/\$\{activeId\}\/resubmit/);
  assert.match(panel,/\/contracts\/\$\{contractId\}\/renewals/);
  assert.match(panel,/setContractId\(value\)/);
  assert.doesNotMatch(form,/Kỳ tái ký một năm lịch; gián đoạn giữa hai kỳ phải có lý do/);
  assert.doesNotMatch(form,/Không tự thay đổi quyền bảo vệ Sales, doanh thu/);
});

test('input and select styles are consistent and value is displayed as VND',()=>{
  assert.match(form,/h-11 w-full rounded-xl px-3 text-sm/);
  assert.match(form,/containerClassName="w-full"/);
  assert.match(form,/<AppCurrencyInput/);
  assert.match(form,/onValueChange=\{setAmount\}/);
  assert.match(form,/sm:grid-cols-2/);
  assert.match(form,/type="date"/);
  assert.match(form,/maxLength=\{1000\}/);
  assert.match(form,/gapDetected&&/);
});

test('editable combobox searches within same input and resolves exact contract id',()=>{
  assert.match(form,/<AppSearchCombobox id="kc02-contract"/);
  assert.match(form,/label:x.school_name/);
  assert.doesNotMatch(form,/x.school_name\+' · '\+x.contract_code/);
  assert.match(combobox,/role="combobox"/);
  assert.match(combobox,/aria-autocomplete="list"/);
  assert.match(combobox,/role="listbox"/);
  assert.match(combobox,/role="option"/);
  assert.match(combobox,/onChange=\{event=>\{/);
  assert.match(combobox,/onValueChange\(''\)/);
  assert.match(combobox,/choose\(visible\[active\]\)/);
  assert.match(combobox,/onValueChange\(option.value\)/);
  assert.match(combobox,/toLocaleLowerCase\('vi'\)/);
  assert.match(combobox,/Không tìm thấy trường phù hợp/);
  assert.match(combobox,/event.key==='Escape'/);
  assert.match(combobox,/event.key==='ArrowDown'/);
});

test('file input keeps the exact evidence upload contract',()=>{
  assert.match(form,/border-dashed/);
  assert.match(form,/UploadCloud/);
  assert.match(form,/file\?\.name/);
  assert.match(form,/accept="\.pdf,image\/jpeg,image\/png,image\/webp"/);
  assert.match(panel,/form\.set\('kind','RENEWAL'\)/);
  assert.match(panel,/form\.set\('file',file\)/);
  assert.match(panel,/evidence_id:proof\.data\.id/);
  assert.match(panel,/end!==calendarYearEnd\(start\)/);
  assert.match(panel,/gapDetected&&!gapReason\.trim\(\)/);
});
