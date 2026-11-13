import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {resolveManagerCommissionForm} from '../src/screens/Board/commission-manager-policy.ts';

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
  assert.doesNotMatch(page,/managerReset\.id/);
  assert.doesNotMatch(page,/JSON\.stringify\(\{expectedVersionId:/);
});

test('manager button opens direct Dialog without the legacy manager Drawer',()=>{
  assert.ok(page.includes('onClick={startManager}'));
  assert.ok(page.includes("managerOnly={dialog?.scope==='MANAGER'}"));
  assert.ok(page.includes('resolveManagerPolicy={getManagerRates}'));
  assert.doesNotMatch(page,/managerListOpen|activeManagerRules|startManagerRule|resetManager/);
  assert.ok(!page.includes('Thêm điều chỉnh'));
  assert.ok(form.includes('{!managerOnly&&<div'));
  assert.ok(form.includes('resolveManagerPolicy(f.organizationId,selectedId)'));
  assert.ok(form.includes('!managerOnly&&(lockTarget||form.expectedVersionId!==null)'));
});

test('success and API errors use the shared toast; field validation remains in Dialog',()=>{
  assert.ok(page.includes("import { appNotice } from '@/components/common/app-toast-provider'"));
  assert.ok(page.includes("appNotice.success('Đã lưu và áp dụng tỷ lệ hoa hồng mới.')"));
  assert.ok(page.includes("appNotice.success('Đã khôi phục chính sách kế thừa.')"));
  assert.ok(page.includes("appNotice.error('Không thể lưu chính sách hoa hồng.'"));
  assert.doesNotMatch(page,/setNotice\(|\{notice&&/);
  assert.ok(form.includes('setLocalError'));
});

test('manager form loads existing scoped override, reset inheritance and new manager fallback',()=>{
  const defaults={salesPercent:25,managerPercent:5};
  const versions=[
    {id:1,scope:'SYSTEM',organizationId:null,managerUserId:null,status:'ACTIVE',salesPercent:25,managerPercent:5,createdAt:'2026-11-13T03:00:00Z'},
    {id:10,scope:'MANAGER',organizationId:1,managerUserId:20,status:'ACTIVE',salesPercent:20,managerPercent:10,createdAt:'2026-11-13T03:05:00Z'},
    {id:11,scope:'MANAGER',organizationId:2,managerUserId:20,status:'ACTIVE',salesPercent:24,managerPercent:6,createdAt:'2026-11-13T03:06:00Z'},
    {id:12,scope:'MANAGER',organizationId:1,managerUserId:30,status:'RESET',salesPercent:0,managerPercent:0,createdAt:'2026-11-13T03:07:00Z'},
    {id:13,scope:'MANAGER',organizationId:1,managerUserId:20,status:'ACTIVE',salesPercent:22,managerPercent:8,createdAt:'2026-11-13T03:08:00Z'},
  ];
  assert.deepEqual(resolveManagerCommissionForm(versions,defaults,1,20),{salesPercent:'22',managerPercent:'8',expectedVersionId:13});
  assert.deepEqual(resolveManagerCommissionForm(versions,defaults,2,20),{salesPercent:'24',managerPercent:'6',expectedVersionId:11});
  assert.deepEqual(resolveManagerCommissionForm(versions,defaults,1,30),{salesPercent:'25',managerPercent:'5',expectedVersionId:12});
  assert.deepEqual(resolveManagerCommissionForm(versions,defaults,1,40),{salesPercent:'25',managerPercent:'5',expectedVersionId:null});
});

test('Sales filter displays only names while retaining record IDs and table emails',()=>{
  assert.match(page,/options=\{\[\{value:'ALL',label:'Tất cả Sales'\},\.\.\.filteredSales\.map\(s=>\(\{value:String\(s\.userId\),label:s\.name\}\)\)\]\}/);
  assert.doesNotMatch(page,/label:s\.name\+' · '\+s\.email/);
  assert.match(page,/\{p\.email\|\|'Chưa có email'\}/);
});

test('Sales table hides record-range summary but retains page size and navigation',()=>{
  assert.match(page,/<AppPagination page=\{page\} pageSize=\{pageSize\} total=\{visible\.length\} showSummary=\{false\}/);
  assert.match(page,/pageSizeOptions=\{\[10,20,50\]\}/);
  assert.match(page,/onPageChange=\{setPage\}/);
  assert.match(page,/onPageSizeChange=\{n=>\{setPageSize\(n\);setPage\(1\);\}\}/);
});
