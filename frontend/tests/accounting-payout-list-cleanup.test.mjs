import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
const part=page.slice(page.indexOf("{accountingTab==='PAYOUTS'&&<AdminListPanel>"),page.indexOf('<AppDrawer wide compactAccountingHeader'));

test('Accounting payout tab shares Sales list surface and displays only a tracked payout table',()=>{
  assert.match(part,/<AdminListPanel>/);
  assert.match(part,/<AdminListToolbar/);
  assert.match(part,/<table className=\{adminTableClass\}>/);
  assert.match(part,/<thead className=\{adminTableHeadClass\}>/);
  assert.equal((part.match(/<table\b/g)||[]).length,1);
  assert.doesNotMatch(part,/Hoa hồng chưa lập phiếu|Phiếu chi theo người hưởng/);
  for (const name of ['Mã phiếu','Người hưởng','Vai trò','Thực chi','Trạng thái','Kỳ'])
    assert.ok(part.includes(name),name);
  assert.equal((part.match(/<th scope="col"/g)||[]).length,6);
});
test('All statuses label is concise, with complete payout lifecycle options',()=>{
  assert.match(part,/value:'ALL',label:'Tất cả'/);
  assert.doesNotMatch(part,/Mọi trạng thái/);
  for(const value of ['DRAFT','PENDING_APPROVAL','CHANGES_REQUESTED','APPROVED','PAID','CANCELLED','REJECTED'])
    assert.ok(part.includes("value:'"+value+"'"),value);
  assert.match(part,/payoutStatusLabel\(p.status\)/);
  assert.match(part,/whitespace-nowrap rounded-full/);
  assert.match(part,/payoutPeriodLabel\(p.period\)/);
});
test('Search applies on submission, pagination resets with filters, and uses all filtered rows',()=>{
  assert.match(page,/const \[financeAppliedSearch,setFinanceAppliedSearch\]/);
  assert.match(page,/financeAppliedSearch\.trim\(\)\.toLocaleLowerCase/);
  assert.match(part,/setFinanceAppliedSearch\(financeSearch\.trim\(\)\);setFinancePage\(1\)/);
  assert.match(page,/const visiblePayouts=displayedPayouts\.slice\(\(financePage-1\)\*financePageSize,financePage\*financePageSize\)/);
  assert.match(part,/total=\{displayedPayouts.length\}/);
  assert.match(part,/pageSizeOptions=\{\[10,20,50,100\]\}/);
  assert.match(part,/onPageChange=\{setFinancePage\}/);
  assert.match(part,/onReset=\{resetFinanceFilters\}/);
  assert.match(part,/onValueChange=\{next=>\{setFinanceStatus\(next\);setFinancePage\(1\);\}\}/);
});
test('Payout tracking is UI-only and contract detail workflow remains available',()=>{
  assert.match(page,/accountingTab==='CONTRACTS'/);
  assert.match(page,/setSelected\(row.id\)/);
  assert.match(page,/\/payouts\/\$\{.*\}\/submit/);
  assert.match(page,/financeOverview\?\.payouts/);
  assert.match(part,/title=\{p.code\}/);
  assert.match(part,/channelMoney\(p.net_amount\)/);
});
