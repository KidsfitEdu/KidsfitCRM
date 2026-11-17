import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
test('Accounting has one workspace table, eight columns, one detail Drawer and no tabs',()=>{
 const shell=read('src/screens/Accounting/Revenue/RevenuePage.tsx');
 const ui=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
 assert.doesNotMatch(shell,/AccountingTab|ServiceInterruptionPanel|ContractRenewalAccountingPanel/);
 const start=ui.indexOf('<table className="block w-full text-left text-sm xl:table xl:table-fixed');
 const firstTable=ui.slice(start,ui.indexOf('</table>',start)+8);
 assert.ok(start>=0);
 assert.equal((firstTable.match(/<th scope="col"/g)||[]).length,8);
 for(const label of ['Nhà trường','Sales phụ trách','Kỳ sử dụng','Dịch vụ','Cần xử lý','Thanh toán','Hoa hồng','Thao tác'])
  assert.ok(ui.includes(label),label);
 assert.match(ui,/\/accounting\/workspace/);
 assert.match(ui,/AccountingRenewalInline/);
 assert.match(ui,/Tình trạng dịch vụ & quyền bảo vệ/);
 assert.doesNotMatch(ui,/<p className="mt-1 text-xs text-muted-foreground">\{row\.contract_code\}<\/p>/);
 assert.equal((ui.match(/<AppDrawer\b/g)||[]).length,1);
});
test('Renewal confirmation remains scoped and uses existing KC-02 APIs in the main Drawer',()=>{
 const inline=read('src/screens/Accounting/Contracts/AccountingRenewalInline.tsx');
 assert.match(inline,/\/accounting\/contracts\/.*\/periods/);
 assert.match(inline,/\/accounting\/renewals\//);
 assert.match(inline,/channel_sales\.renewal\.review/);
 assert.match(inline,/channel_sales\.renewal\.confirm/);
 assert.match(inline,/Xác nhận tái ký/);
 assert.match(inline,/Yêu cầu bổ sung/);
 assert.match(inline,/Từ chối/);
 assert.doesNotMatch(inline,/<AppDrawer/);
});
test('Backend filters before pagination and scoping applies to all accounting rows',()=>{
 const api=read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');
 assert.match(api,/access\.Contracts\(db\)\.AsNoTracking\(\)/);
 assert.match(api,/c\.VerifiedAt\.HasValue/);
 assert.match(api,/ServiceInterruptionPolicy\.Evaluate/);
 assert.match(api,/\.Where\(c => filter switch/);
 assert.match(api,/rows\.Skip\(\(pn - 1\) \* size\)\.Take\(size\)/);
 assert.match(api,/access\.Has\(Permissions\.ContractRenewalReview\)/);
});

test('GI-01 milestones differ from actual release and labels remain concise',()=>{
 const api=read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');
 const ui=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
 const firstTable=ui.slice(ui.indexOf('<table className="block w-full text-left text-sm xl:table'),ui.indexOf('</table>',ui.indexOf('<table className="block w-full text-left text-sm xl:table'))+8);
 assert.match(api,/today == assessment\.ThresholdOn \? "THRESHOLD_REACHED" : "THRESHOLD_OVERDUE"/);
 assert.match(api,/e\.GapStartOn == assessment\.GapStartOn\.Value/);
 assert.match(api,/e\.Status == "RELEASED"/);
 assert.match(api,/!protectedCustomers\.Contains\(c\.CustomerId\)/);
 assert.match(api,/released \? "RELEASED"/);
 for(const label of ['Đang sử dụng','Sắp hết hạn','Gián đoạn',
  'Đủ 12 tháng','Quá 12 tháng','Đã hết bảo vệ','Cần rà soát']) {
  assert.ok(ui.includes(label),'Missing state '+label);
 }
 assert.match(ui,/Đạt mốc/);
 assert.match(ui,/Mốc 12 tháng/);
 assert.doesNotMatch(firstTable,/channelMoney\(row\.total_value\)/);
 assert.match(firstTable,/Tổng thực thu/);
 assert.match(firstTable,/channelMoney\(row\.received\)/);
 assert.doesNotMatch(firstTable,/row\.received-row\.refunded/);
 assert.match(firstTable,/Tổng hoa hồng/);
 assert.match(firstTable,/channelMoney\(row\.commission\)/);
 assert.doesNotMatch(ui,/Đã thu sau hoàn tiền/);
 assert.doesNotMatch(ui,/Hoa hồng ghi nhận: \{channelMoney\(row\.commission\)\}/);
});

test('Kidsfit branding differentiates service states from accounting actions without affecting other roles',()=>{
 const badges=read('src/components/common/app-status-badge.tsx');
 const table=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
 assert.match(badges,/variant='default'/);
 assert.match(badges,/kidsfitServiceVisuals/);
 assert.match(badges,/kidsfitActionVisuals/);
 for(const status of ['CONTINUOUS','EXPIRING_SOON','INTERRUPTED','THRESHOLD_REACHED',
  'THRESHOLD_OVERDUE','RELEASED','NEEDS_REVIEW','INACTIVE']) {
  assert.ok(badges.includes(status+': {'),status);
 }
 for(const cls of ['bg-emerald-100','bg-amber-100','bg-orange-100','bg-pink-100',
  'bg-red-100','bg-violet-100','bg-sky-100','dark:bg-sky-950']) {
  assert.ok(badges.includes(cls),cls);
 }
 assert.match(table,/variant="kidsfit-service" status=\{state\}/);
 assert.match(table,/variant="kidsfit-action" status="CONFIRM_RENEWAL"/);
 assert.match(table,/variant="kidsfit-action" status="REVIEW_PERIOD"/);
 assert.match(table,/<span className="text-muted-foreground">—<\/span>/);
 assert.doesNotMatch(table,/font-semibold text-amber-800 dark:text-amber-200/);
});


test('Accounting contract list keeps eight fields without forced table min width',()=>{
 const ui=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
 assert.doesNotMatch(ui,/min-w-\[1280px\]/);
 assert.match(ui,/xl:table-fixed/);
 assert.match(ui,/xl:hidden/);
 assert.match(ui,/Tổng thực thu/);
 assert.match(ui,/Tổng hoa hồng/);
 assert.match(ui,/channelMoney\(row\.received\)/);
 assert.doesNotMatch(ui,/const amount=Math\.max\(0,row\.received-row\.refunded\)/);
 assert.match(ui,/onClick=\{\(\)=>setSelected\(row\.id\)\}/);
});
