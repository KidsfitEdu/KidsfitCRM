import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const src=(file)=>readFileSync(resolve(import.meta.dirname,'../src/',file),'utf8');
const page=src('screens/Board/BoardCommissionPoliciesPanel.tsx');
const form=src('screens/Board/BoardCommissionDialog.tsx');
const tabs=src('screens/Board/Policies/PoliciesPage.tsx');

test('BGĐ commission list uses the seven explicitly approved columns',()=>{
  for(const header of ['Họ và tên Sales','Quản lý phụ trách','Tổ chức',
    'Sales (%)','Quản lý (%)','Tổng (%)','Thao tác'])
    assert.ok(page.includes(header),header);
  assert.match(page,/p\.email\|\|'Chưa có email'/);
  assert.match(page,/p\.name/);
});

test('BGĐ uses consistent components and three dependent filters',()=>{
  for(const name of ['AdminListPanel','AdminListToolbar','AdminIconAction','AppPagination','AppSelect'])
    assert.ok(page.includes(name),name);
  for(const label of ['Lọc tổ chức','Lọc Quản lý','Lọc Sales'])
    assert.ok(page.includes(label),label);
  assert.match(tabs,/AppPageHeader/);
  assert.match(tabs,/Chính sách vận hành/);
});

test('default has edit icon and form uses reusable dialog without date or reason',()=>{
  assert.match(page,/Chỉnh sửa hoa hồng mặc định/);
  assert.match(page,/icon=\{Pencil\}/);
  assert.match(form,/AppDialog/);
  assert.match(form,/AppNativeSelect/);
  assert.match(form,/Lưu &amp; áp dụng/);
  assert.doesNotMatch(form,/Ngày hiệu lực|Lý do điều chỉnh|effectiveFrom|reason:/i);
});

test('financial ledger and manager-write screens stay independent',()=>{
  assert.doesNotMatch(page,/commission-ledger|payouts|\/commission-config\/manager/);
  assert.doesNotMatch(form,/commission-ledger|payouts/);
});

test('commission API response is mapped from snake_case before rendering totals and filters',()=>{
  for(const field of ['sales_percent','manager_percent','total_percent','organization_id',
    'user_id','manager_user_id','manager_name','manager_email','has_own_override',
    'own_version_id','version_id','created_at','created_by_user_id']){
    assert.ok(page.includes(field),field);
  }
  assert.match(page,/mapWorkspace\(await channelRequest<ApiWorkspace>/);
  assert.match(page,/requireRate\(raw\.defaults\.sales_percent/);
  assert.match(page,/requireRate\(raw\.defaults\.manager_percent/);
  assert.match(page,/requireRate\(s\.total_percent/);
});

test('save and reset use the backend snake_case contract',()=>{
  assert.match(page,/sales_percent:Number\(v\.salesPercent\)/);
  assert.match(page,/manager_percent:Number\(v\.managerPercent\)/);
  assert.match(page,/expected_version_id:previous\?\.id\?\?null/);
  assert.match(page,/expected_version_id:confirmReset\.ownVersionId/);
  assert.match(page,/expected_version_id:managerReset\.id/);
  assert.doesNotMatch(page,/JSON\.stringify\(\{expectedVersionId:/);
});
