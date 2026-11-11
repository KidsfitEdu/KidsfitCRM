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
  assert.equal((accounting.match(/<AppSelect\b/g)||[]).length,2);
  assert.match(accounting,/onValueChange=\{next=>\{setWorkspaceStatus\(next\);setPage\(1\);\}\}/);
  assert.match(accounting,/onValueChange=\{next=>\{setOwnerUserId\(next\);setPage\(1\);\}\}/);
  assert.match(pagination,/pageSizeOptions\.map\(size => \(\{value:String\(size\),label:String\(size\)\}\)\)/);
  assert.match(pagination,/onValueChange=\{next => onPageSizeChange\(Number\(next\)\)\}/);
  assert.doesNotMatch(pagination,/AppNativeSelect/);
  assert.match(accounting,/Gián đoạn dịch vụ/);
  assert.match(accounting,/Lịch sử tài chính/);
});

test('CRM list filters keep the native control for form, time and validation use',()=>{
  const picker=source('src/components/common/forms/app-date-time-picker.tsx');
  const personnel=source('src/screens/Admin/Personnel/PersonnelPage.tsx');
  const renewal=source('src/components/roles/ContractRenewalSalesPanel.tsx');
  assert.match(picker,/<AppNativeSelect id=\{fieldId \+ '-hour'\}/);
  assert.match(picker,/<AppNativeSelect id=\{fieldId \+ '-minute'\}/);
  assert.match(personnel,/<AppNativeSelect id="admin-new-org"/);
  assert.match(renewal,/<AppNativeSelect id="kc02-contract"/);
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
