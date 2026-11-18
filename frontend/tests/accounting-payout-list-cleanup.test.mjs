import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
const part=page.slice(page.indexOf("{accountingTab==='PAYOUTS'&&<AdminListPanel className=\"min-w-0\">"),page.indexOf('<AppDrawer wide compactAccountingHeader'));

test('Accounting payout tab manages eligible candidates and tracked payout records',()=>{
  assert.match(part,/<AdminListPanel className="min-w-0">/);
  assert.match(part,/<AdminListToolbar/);
  assert.match(part,/<table className=\{adminTableClass\+' table-fixed'\}>/);
  assert.doesNotMatch(part,/accounting-eligible-payouts/);
  assert.match(page,/title="Lập phiếu chi hoa hồng"/);
  assert.match(page,/setPayoutPickerOpen\(true\)/);
  assert.match(page,/openCentralPayout\(\{contractId:chosenCandidate\.contract_id/);
  assert.match(part,/setPayoutPreview\(p\)/);
  for (const name of ['Người hưởng','Nhà trường','Số tiền đề nghị / thực chi','Trạng thái','Kỳ','Thao tác'])
    assert.ok(part.includes(name),name);
  assert.equal((part.match(/<th scope="col"/g)||[]).length,6);
});
test('All statuses label is concise, with complete payout lifecycle options',()=>{
  assert.match(part,/value:'ALL',label:'Tất cả trạng thái'/);
  assert.doesNotMatch(part,/Mọi trạng thái/);
  for(const value of ['DRAFT','PENDING_APPROVAL','CHANGES_REQUESTED','APPROVED','PAID','CANCELLED','REJECTED'])
    assert.ok(part.includes("value:'"+value+"'"),value);
  assert.match(part,/payoutStatusLabel\(p.status\)/);
  assert.match(part,/<AppStatusBadge size="sm" status=\{p.status\}/);
  assert.match(part,/payoutPeriodLabel\(p.period\)/);
});
test('Search applies on submission, pagination resets with filters, and uses all filtered rows',()=>{
  assert.match(page,/const \[financeAppliedSearch,setFinanceAppliedSearch\]/);
  assert.match(page,/params\.set\('search',financeAppliedSearch\)/);
  assert.match(part,/setFinanceAppliedSearch\(financeSearch\.trim\(\)\);setFinancePage\(1\)/);
  assert.match(page,/const visiblePayouts=payoutRows/);
  assert.match(part,/total=\{payoutTotal\}/);
  assert.match(part,/pageSizeOptions=\{\[10,20,50,100\]\}/);
  assert.match(part,/onPageChange=\{setFinancePage\}/);
  assert.match(part,/onReset=\{resetFinanceFilters\}/);
  assert.match(part,/onValueChange=\{next=>\{setFinanceStatus\(next\);setFinancePage\(1\);\}\}/);
});
test('Payout tracking is UI-only and contract detail workflow remains available',()=>{
  assert.match(page,/accountingTab==='CONTRACTS'/);
  assert.match(page,/openContract\(contractId,renewalId\)/);
  assert.match(page,/\/payouts\/\$\{.*\}\/submit/);
  assert.match(page,/\/accounting\/payouts\?/);
  assert.match(part,/p.beneficiary_name/);
  assert.match(part,/channelMoney\(p.net_amount\)/);
});

test('Accounting tabs use the same underline navigation visual language as Sales',()=>{
  const sales=readFileSync(resolve(import.meta.dirname,'../src/components/roles/SalesFocusPage.tsx'),'utf8');
  for (const className of ['-mb-px','border-b-2','px-1 py-3','border-[#1b5e20]','text-muted-foreground']) {
    assert.ok(page.includes(className), 'Accounting missing '+className);
    assert.ok(sales.includes(className), 'Sales reference missing '+className);
  }
  assert.match(page,/role="tablist" aria-label="Nghiệp vụ Kế toán"/);
  assert.match(page,/role="tab" key=\{item\.key\}/);
  assert.match(page,/aria-selected=\{accountingTab===item\.key\}/);
  assert.match(page,/setAccountingTab\(item\.key\)/);
  assert.match(page,/overflow-x-auto overflow-y-hidden border-b border-border bg-transparent/);
  assert.doesNotMatch(page,/rounded-lg px-4 py-2 text-sm font-semibold transition-colors/);
});
