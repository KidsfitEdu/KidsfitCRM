import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const source=(path)=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');

test('Kidsfit list filters use the existing Base UI Select primitive and accessible labels',()=>{
  const shared=source('src/components/common/app-select.tsx');
  const primitives=source('src/components/ui/select.tsx');
  assert.match(shared,/Select, SelectContent, SelectItem, SelectTrigger, SelectValue/);
  assert.match(primitives,/@base-ui\/react\/select/);
  assert.match(shared,/aria-label=\{ariaLabel\}/);
  assert.match(shared,/onValueChange=\{next =>/);
  assert.match(shared,/disabled=\{disabled\}/);
  assert.match(shared,/side="bottom"/);
  assert.match(shared,/alignItemWithTrigger=\{false\}/);
  assert.match(shared,/max-h-/);
  assert.match(shared,/focus-visible/);
  assert.match(shared,/dark:focus:/);
});

test('Accounting filters and pagination share branded dropdown without changing filter semantics',()=>{
  const accounting=source('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  const pagination=source('src/components/common/app-pagination.tsx');
  assert.ok((accounting.match(/<AppSelect\b/g)||[]).length>=4); // Two existing filters plus payout role and status.
  assert.match(accounting,/onValueChange=\{next=>\{setWorkspaceStatus\(next\);setPage\(1\);\}\}/);
  assert.match(accounting,/onValueChange=\{next=>\{setOwnerUserId\(next\);setPage\(1\);\}\}/);
  assert.match(pagination,/pageSizeOptions\.map\(size => \(\{value:String\(size\),label:String\(size\)\}\)\)/);
  assert.match(pagination,/onValueChange=\{next => onPageSizeChange\(Number\(next\)\)\}/);
  assert.doesNotMatch(pagination,/AppNativeSelect/);
  assert.match(accounting,/Gián đoạn dịch vụ/);
  assert.match(accounting,/Lịch sử tài chính/);
});

test('CRM keeps native time/payment selectors while renewal school supports inline search',()=>{
  const picker=source('src/components/common/forms/app-date-time-picker.tsx');
  const personnel=source('src/screens/Admin/Personnel/PersonnelPage.tsx');
  const renewal=source('src/components/roles/ContractRenewalSalesPanel.tsx');
  assert.match(picker,/<AppNativeSelect id=\{fieldId \+ '-hour'\}/);
  assert.match(picker,/<AppNativeSelect id=\{fieldId \+ '-minute'\}/);
  assert.match(personnel,/<AppNativeSelect id="admin-new-org"/);
  assert.match(renewal,/<AppSearchCombobox id="kc02-contract"/);
  assert.match(renewal,/<AppNativeSelect id="kc02-cycle"/);
  for(const path of ['src/screens/Admin/Proposals/ProposalsPage.tsx',
    'src/screens/Board/BoardDisputesPage.tsx',
    'src/screens/Checkee/Verification/VerificationPage.tsx',
    'src/screens/SalesManager/Contracts/ContractsPage.tsx',
    'src/components/crm/school-directory.tsx',
    'src/components/crm/ProtectionRenewalPanel.tsx',
    'src/components/roles/ManagerWorklists.tsx']){
      const code=source(path);
      assert.match(code,/<AppSelect\b/,'Missing branded filter in '+path);
  }
});


test('Selected status is rendered as its Vietnamese option label instead of a workflow code',()=>{
  const shared=source('src/components/common/app-select.tsx');
  const proposals=source('src/screens/Admin/Proposals/ProposalsPage.tsx');
  assert.match(shared,/options\.find\(option => option\.value === value\)\?\.label/);
  assert.match(shared,/<SelectValue[^>]*>\{selectedLabel/);
  assert.match(proposals,/\{value:'PENDING_ADMIN',label:'Chờ Admin'\}/);
  assert.match(proposals,/\{value:'PENDING_MANAGER',label:'Chờ Quản lý'\}/);
});

test('Admin search toolbar controls and branded select use a shared 40px height',()=>{
  const shared=source('src/components/common/app-select.tsx');
  const toolbar=source('src/components/common/admin-list-ui.tsx');
  assert.match(shared,/!h-10 min-w-0/);
  assert.match(toolbar,/placeholder=\{placeholder\} className="h-10 w-full/);
  assert.match(toolbar,/className="h-10 rounded-lg px-4">Tìm kiếm/);
  assert.match(toolbar,/className="h-10 w-10 min-w-10 rounded-lg p-0"/);
});


test('Shared select list adds a real gap between adjacent active and selected highlights',()=>{
  const shared=source('src/components/common/app-select.tsx');
  assert.match(shared,/listClassName="flex flex-col gap-1"/);
  assert.match(shared,/min-h-10 rounded-lg/);
  const primitive=source('src/components/ui/select.tsx');
  assert.match(primitive,/<SelectPrimitive.List className=\{listClassName\}>/);
  assert.match(shared,/focus:bg-primary\/10/);
  assert.match(shared,/data-\[selected\]:bg-primary\/10/);
});
