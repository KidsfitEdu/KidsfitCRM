import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const page=read('src/screens/Accounting/Dashboard/DashboardPage.tsx');
const backend=read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesOperationsEndpoints.cs');

test('Accounting dashboard shares month picker and only loads scoped finance API',()=>{
  assert.match(page,/useState\(currentBusinessPeriod\)/);
  assert.match(page,/<AppMonthPicker label="Kỳ báo cáo"/);
  assert.match(page,/queryKey: \['accounting-overview', apiBase, token, period\]/);
  assert.match(page,/enabled: connected/);
  assert.match(page,/\/finance\?period=\$\{period\}/);
  assert.match(backend,/ChannelSalesAccess.Load\(db, http.UserId\(\), ct\)/);
  assert.match(backend,/ChannelSalesCommissionView/);
});

test('Actual transfers use paid date even when accrued in another commission month',()=>{
  const section=backend.slice(backend.indexOf('var paidInMonth'),backend.indexOf('var contracts =',backend.indexOf('var paidInMonth')));
  assert.match(section,/payoutsQuery.Where\(x => x.Status == "PAID" && x.PaidAt >= start && x.PaidAt < end\)/);
  assert.doesNotMatch(section,/x.Period == selectedPeriod/);
  assert.match(backend,/take_home = await paidInMonth.SumAsync\(x => \(decimal\?\)x.NetAmount/);
  assert.match(page,/Theo ngày chi thực tế trong tháng/);
});

test('Trend uses six bounded months with receipt, refund, and accrual aggregates',()=>{
  assert.match(backend,/for \(var i = 5; i >= 0; i--\)/);
  assert.match(backend,/var monthStart = start.AddMonths\(-i\)/);
  assert.match(backend,/var monthEnd = monthStart.AddMonths\(1\)/);
  assert.match(backend,/monthCollected - monthRefunded/);
  assert.match(backend,/scopedEntries.Where\(x => x.Period == monthPeriod\)/);
  assert.match(backend,/revenue_trend = trend/);
  assert.match(page,/<LineChart accessibilityLayer data=\{trend\}/);
  assert.match(page,/dataKey="net"/);
  assert.match(page,/dataKey="accrued"/);
});

test('Payout status snapshot is by creation date, backlog across reporting periods',()=>{
  assert.match(backend,/createdPayouts = payoutsQuery.Where\(x => x.CreatedAt >= start && x.CreatedAt < end\)/);
  assert.match(backend,/payout_statuses = payoutStatusCounts/);
  assert.match(backend,/outstandingPayouts = payoutsQuery.Where/);
  assert.match(backend,/x.Status == "PENDING_APPROVAL"/);
  assert.match(backend,/x.Status == "CHANGES_REQUESTED"/);
  assert.match(backend,/x.Status == "APPROVED"/);
  assert.match(page,/<PieChart accessibilityLayer>/);
  assert.match(page,/Các phiếu chưa hoàn tất, bao gồm tồn đọng từ kỳ trước/);
});

test('Eligible KPI uses payout candidates and never mixes with reconciliation-only amount',()=>{
  assert.match(backend,/eligible_for_payout = await eligiblePayouts.SumAsync/);
  assert.match(page,/amount:summary\?\.eligible_for_payout/);
  assert.doesNotMatch(page,/Hoa hồng chờ đối soát \/ chi/);
  assert.match(page,/Chưa có dữ liệu tài chính để hiển thị xu hướng/);
});
