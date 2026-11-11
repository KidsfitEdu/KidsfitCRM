import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
test('Accounting has one workspace table, eight columns, one detail Drawer and no tabs',()=>{
 const shell=read('src/screens/Accounting/Revenue/RevenuePage.tsx');
 const ui=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
 assert.doesNotMatch(shell,/AccountingTab|ServiceInterruptionPanel|ContractRenewalAccountingPanel/);
 const firstTable=ui.slice(ui.indexOf('<table className="w-full min-w-[1280px]'),
   ui.indexOf('</table>',ui.indexOf('<table className="w-full min-w-[1280px]'))+8);
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
 assert.match(inline,/\/accounting\/contracts\/.*\/renewals/);
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
 assert.match(ui,/Giá trị hợp đồng<\/p>\s*<p className="mt-1 font-semibold">\{channelMoney\(row\.total_value\)\}/);
 assert.match(ui,/Thực thu<\/p>\s*<p className="mt-1 font-semibold">\{channelMoney\(amount\)\}/);
 assert.match(ui,/Hoa hồng ghi nhận<\/p>\s*<p className="mt-1 font-semibold">\{channelMoney\(row\.commission\)\}/);
 assert.doesNotMatch(ui,/Đã thu sau hoàn tiền/);
 assert.doesNotMatch(ui,/Hoa hồng ghi nhận: \{channelMoney\(row\.commission\)\}/);
});
