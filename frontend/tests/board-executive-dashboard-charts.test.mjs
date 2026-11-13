import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const page=read('src/screens/Board/BoardDashboardPage.tsx');
const hooks=read('src/screens/Board/board-data.ts');
const api=read('../backend/src/KidsfitCRM.Api/Features/SchoolOperationsEndpoints.cs');
const report=api.slice(api.indexOf('public static async Task<IResult> Report('));

test('director dashboard displays exactly approved KPI labels and two meaningful charts',()=>{
  for(const title of ['Doanh thu thực thu ròng','Hợp đồng hiệu lực','Trường còn khả dụng',
    'Hồ sơ quá hạn','Xu hướng doanh thu theo tháng','Cơ cấu trạng thái trường'])
    assert.ok(page.includes(title),title);
  assert.match(page,/xl:grid-cols-4/);
  assert.match(page,/xl:grid-cols-3/);
  assert.match(page,/xl:col-span-2/);
  assert.match(page,/LineChart/);
  assert.match(page,/PieChart/);
  assert.match(page,/ChartContainer/);
  assert.doesNotMatch(page,/Hiệu suất Sales\/CTV|Hiệu suất phân bổ theo Quản lý và Sales|Cảnh báo cần theo dõi|Đối soát doanh thu theo kỳ/);
});
test('revenue compares with preceding month only when previous period is meaningful',()=>{
  assert.match(page,/previous_net_revenue/);
  assert.match(page,/if\(previous===0\)/);
  assert.match(page,/Kỳ trước chưa có doanh thu/);
  assert.match(page,/so với tháng trước/);
  assert.match(page,/Thực thu, hoàn tiền và thu ròng/);
  assert.match(page,/boardMoney\(Number\(value\)\)/);
});
test('director cards distinguish current operational snapshots from selected financial period',()=>{
  assert.match(page,/Tại thời điểm hiện tại/);
  assert.match(page,/Không phụ thuộc kỳ báo cáo/);
  assert.match(page,/Chưa được cấp quyền xem doanh thu/);
  assert.match(page,/Chưa có dữ liệu cơ cấu trường/);
  assert.match(page,/Đang tải dữ liệu báo cáo/);
  assert.match(page,/report\.error/);
  assert.match(page,/report\.refetch\(\)/);
});
test('dashboard avoids loading unrelated operations page and uses existing authorized report',()=>{
  assert.match(page,/useBoardData\(permitted\?apiBase:'',token,period,1,false\)/);
  assert.match(hooks,/enabled: connected && withOperations/);
  assert.match(hooks,/\/school-operations\/report\?period=/);
  assert.doesNotMatch(page,/operations\.data|operations\.refetch/);
});
test('server computes revenue trend from scoped completed receipts less refunds in local calendar months',()=>{
  assert.match(report,/contractIds\.Contains\(x\.ContractId\)/);
  assert.match(report,/x\.Status == "COMPLETED"/);
  assert.match(report,/x\.ReceivedAt >= monthStart && x\.ReceivedAt < monthEnd/);
  assert.match(report,/x\.RefundedAt >= monthStart && x\.RefundedAt < monthEnd/);
  assert.match(report,/start\.AddHours\(7\)\.AddMonths\(-offset\)\.AddHours\(-7\)/);
  assert.match(report,/start\.AddHours\(7\)\.AddMonths\(1 - offset\)\.AddHours\(-7\)/);
  assert.match(report,/offset = 5; offset >= 0; offset--/);
  assert.match(report,/a\.All && canMoney \? revenueTrend/);
  assert.match(report,/previous_net_revenue/);
});
test('school status chart uses current active protections and mutually exclusive categories',()=>{
  assert.match(report,/school_statuses = a\.All/);
  assert.match(report,/p\.SourceType == "CONTRACT"/);
  assert.match(report,/p\.EffectiveUntil > now/);
  assert.match(report,/!db\.CustomerProtections\.Any/);
  assert.match(page,/available_schools/);
  assert.match(page,/statusMix\.approaching/);
  assert.match(page,/statusMix\.contracted/);
});
