import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');

test('CSKH renders exactly one assigned-school table with five distinct columns',()=>{
  const ui=read('src/screens/CustomerCare/Customers/CustomersPage.tsx');
  assert.equal((ui.match(/<table\b/g)||[]).length,1);
  assert.equal((ui.match(/<th scope="col"/g)||[]).length,5);
  for(const label of ['Nhà trường','Liên hệ','Dịch vụ','Cần chăm sóc','Thao tác'])
    assert.ok(ui.includes(label),label);
  assert.doesNotMatch(ui,/ServiceInterruptionPanel|<AppDrawer[^]*<AppDrawer/);
  assert.match(ui,/showSummary=\{false\}/);
  assert.match(ui,/key=\{x\.customer_id\}/);
});

test('CSKH preserves assigned contract actions and uses one unified Drawer',()=>{
  const ui=read('src/screens/CustomerCare/Customers/CustomersPage.tsx');
  assert.equal((ui.match(/<AppDrawer\b/g)||[]).length,1);
  assert.match(ui,/role="tablist"/);
  assert.match(ui,/role="tab"/);
  assert.ok(ui.includes("'/care/schools/'+selected.id+'/calls"));
  assert.match(ui,/client\.invalidateQueries\(\{queryKey:\['care-schools'\]/);
  assert.match(ui,/role-customer-care-cases/);
  assert.match(ui,/SchoolProfileDetails/);
  assert.match(ui,/AppStatusBadge/);
});

test('CSKH endpoint filters scoped schools by customer before pagination',()=>{
  const code=read('../backend/src/KidsfitCRM.Api/Features/CustomerCareEndpoints.cs');
  assert.match(code,/Assigned\(db, access\)/);
  assert.match(code,/GroupBy\(c => c\.CustomerId\)/);
  assert.match(code,/ServiceInterruptionService\.AssessAsync/);
  assert.match(code,/requestedStatus != "ALL"/);
  assert.match(code,/result\.Skip\(\(p - 1\) \* size\)\.Take\(size\)/);
  assert.match(code,/assignedContractIds\.Contains\(t\.ContractId\)/);
});

test('shared status badge handles absent API fields without crashing',()=>{
  const badge=read('src/components/common/app-status-badge.tsx');
  assert.match(badge,/status\?:string\|null/);
  assert.match(badge,/typeof status==='string' \? status\.trim\(\)\.toUpperCase\(\) : ''/);
  assert.match(badge,/const displayLabel=typeof label==='string' && label\.trim\(\) \? label : 'Chưa cập nhật'/);
  assert.doesNotMatch(badge,/visuals\[status\.toUpperCase\(\)\]/);
});
