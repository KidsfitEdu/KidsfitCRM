import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');

test('CSKH table has five support-focused columns and four independent icons',()=>{
  const ui=read('src/screens/CustomerCare/Customers/CustomersPage.tsx');
  assert.equal((ui.match(/<table\b/g)||[]).length,1);
  assert.equal((ui.match(/<th scope="col"/g)||[]).length,5);
  for(const name of ['Nhà trường','Liên hệ','Hỗ trợ gần nhất','Ticket lỗi','Thao tác'])
    assert.ok(ui.includes(name),name);
  for(const name of ['Eye','SquarePen','History','Ticket'])
    assert.ok(ui.includes('icon={'+name+'}'),name);
  assert.equal((ui.match(/<AppDrawer\b/g)||[]).length,3);
  assert.match(ui,/title="Cập nhật nhật ký hướng dẫn"/);
  assert.match(ui,/title="Lịch sử hướng dẫn"/);
  assert.match(ui,/title="Chi tiết trường phụ trách"|title=\{selected\?\.school_name/);
  assert.doesNotMatch(ui,/ServiceInterruptionPanel|Gián đoạn dịch vụ|role="tablist"/);
  assert.match(ui,/role-customer-care-cases/);
  assert.match(ui,/showSummary=\{false\}/);
  assert.match(ui,/key=\{x\.customer_id\}/);
});

test('CSKH only logs guidance and retains scoped detail plus ticket routing',()=>{
  const ui=read('src/screens/CustomerCare/Customers/CustomersPage.tsx');
  assert.ok(ui.includes("'/care/schools/'+logSelected.id+'/calls"));
  assert.match(ui,/SchoolProfileDetails units=\{details\.data\.school_units\}/);
  assert.match(ui,/client\.invalidateQueries\(\{queryKey:\['care-schools'\]/);
  assert.match(ui,/role-customer-care-cases/);
});

test('backend groups assigned contracts by customer without GI-01 or Sales rights calculations',()=>{
  const code=read('../backend/src/KidsfitCRM.Api/Features/CustomerCareEndpoints.cs');
  const list=code.slice(code.indexOf('public static async Task<IResult> Schools('),code.indexOf('public static async Task<IResult> SchoolDetail('));
  assert.match(list,/Assigned\(db, access\)/);
  assert.match(list,/GroupBy\(c => c\.CustomerId\)/);
  assert.doesNotMatch(list,/ServiceInterruptionService|ProtectionRenewalPolicy/);
  for(const key of ['HAS_TICKET','SUPPORTED','NOT_SUPPORTED']) assert.ok(list.includes(key));
  assert.match(list,/result\.Skip\(\(p - 1\) \* size\)\.Take\(size\)/);
});
