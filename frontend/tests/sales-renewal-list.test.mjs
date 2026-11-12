import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const read=(path)=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');

test('Sales renewal list loads independently of selected form contract',()=>{
  const ui=read('src/components/roles/ContractRenewalSalesPanel.tsx');
  assert.match(ui,/\/renewals\/mine\?/);
  assert.match(ui,/\/renewals\/mine\/schools/);
  assert.match(ui,/filterSchoolId/);
  assert.match(ui,/label:'Tất cả trường'/);
  assert.match(ui,/label:x.name/);
  assert.doesNotMatch(ui,/Chọn trường \/ hợp đồng để xem lịch sử tái ký/);
  assert.doesNotMatch(ui,/if\(!contractId\)\{setRows\(\[\]\)/);
});

test('Contract renewal creation still requires exact source contract',()=>{
  const ui=read('src/components/roles/ContractRenewalSalesPanel.tsx');
  assert.match(ui,/Hợp đồng được phép tái ký \*/);
  assert.match(ui,/value=\{contractId\}/);
  assert.match(ui,/onChange=\{e=>changeContractForForm\(e.target.value\)\}/);
  assert.match(ui,/\/contracts\/\$\{contractId\}\/renewals/);
  assert.match(ui,/total=\{total\}/);
});

test('Sales history API enforces scoped ownership and server pagination',()=>{
  const api=read('../backend/src/KidsfitCRM.Api/Features/ContractRenewalEndpoints.cs');
  assert.match(api,/MapGet\("\/renewals\/mine", MineList\)/);
  assert.match(api,/MapGet\("\/renewals\/mine\/schools", MineSchools\)/);
  assert.match(api,/renewal.SubmittedByUserId == access.UserId/);
  assert.match(api,/contract.OwnerUserId == access.UserId/);
  assert.match(api,/query.CountAsync\(ct\)/);
  assert.match(api,/Skip\(\(p - 1\) \* size\).Take\(size\)/);
});
