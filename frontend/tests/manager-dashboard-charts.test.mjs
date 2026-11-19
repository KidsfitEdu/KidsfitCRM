import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const source=readFileSync(resolve(import.meta.dirname,'../src/screens/SalesManager/Dashboard/DashboardPage.tsx'),'utf8');
test('manager dashboard uses actual authorized report series and existing chart components',()=>{
  assert.match(source,/activity_trend/);
  assert.match(source,/allocation_performance/);
  assert.match(source,/ChartContainer/);
  assert.match(source,/LineChart/);
  assert.match(source,/BarChart/);
  assert.match(source,/school-operations\/report\?period=/);
  assert.match(source,/manager\/overview/);
});
test('dashboard distinguishes incomplete allocation samples and does not invent pending status',()=>{
  assert.match(source,/performance.length>=200/);
  assert.match(source,/row.accepted/);
  assert.match(source,/row.declined/);
  assert.match(source,/row.cancelled/);
  assert.doesNotMatch(source,/invited\s*-\s*accepted/);
});
test('overview preserves permission checks and period-dependent query key',()=>{
  assert.match(source,/allowed=abilities.includes/);
  assert.match(source,/queryKey:\['sales-manager-report',token,period\]/);
  assert.match(source,/AppMonthPicker/);
  assert.match(source,/label="Kỳ báo cáo" value=\{period\} onChange=\{setPeriod\}/);
  assert.match(source,/allowAll=\{false\}/);
  assert.doesNotMatch(source,/type="month"/);
  assert.match(source,/overview.refetch\(\)/);
  assert.match(source,/report.refetch\(\)/);
});

test('manager refresh reloads overview and selected period without resetting the month',()=>{
  assert.match(source,/const refresh=\(\)=>\{void overview.refetch\(\);void report.refetch\(\);\}/);
  assert.match(source,/onClick=\{refresh\}/);
  assert.match(source,/disabled=\{!connected\|\|overview.isFetching\|\|report.isFetching\}/);
  assert.match(source,/queryKey:\['sales-manager-report',token,period\]/);
  assert.doesNotMatch(source,/setPeriod\(currentBusinessPeriod\(\)\)/);
});
