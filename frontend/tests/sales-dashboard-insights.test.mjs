import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const source=readFileSync(resolve(import.meta.dirname,'../src/components/roles/SalesDashboard.tsx'),'utf8');
const backend=readFileSync(resolve(import.meta.dirname,'../../backend/src/KidsfitCRM.Api/Features/Reports/SalesDashboardReportEndpoints.cs'),'utf8');
test('Sales Dashboard uses account-scoped API for four cards and two charts',()=>{
  assert.match(source,/dashboard\/report\?period=/);
  assert.match(source,/AppMonthPicker/);
  assert.match(source,/ChartContainer/);
  assert.match(source,/LineChart/);
  assert.match(source,/PieChart/);
  assert.match(source,/active_approaches/);
  assert.match(source,/contracts_signed_period/);
  assert.match(source,/pending_invitations/);
  assert.match(source,/protection_breakdown/);
  assert.doesNotMatch(source,/workspace.data.filter/);
});
test('refresh preserves selected month and refetches report',()=>{
  assert.match(source,/queryKey:\['sales-dashboard-report',apiBase,token,period\]/);
  assert.match(source,/void report.refetch\(\)/);
  assert.match(source,/allowAll=\{false\}/);
  assert.match(source,/report.isFetching/);
});
test('Backend scopes all metrics to caller instead of manager-wide report',()=>{
  assert.match(backend,/OwnerUserId == actor/);
  assert.match(backend,/AssigneeUserId == actor/);
  assert.match(backend,/SubmittedByUserId == actor/);
  assert.match(backend,/access.OrganizationIds.Contains/);
  assert.match(backend,/ChannelSalesValidation.Period/);
  assert.match(backend,/EffectiveUntil > now/);
  assert.doesNotMatch(backend,/\.Take\(100\)/);
});
