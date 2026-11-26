import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const read=p=>readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const school=read('src/screens/CustomerCare/Customers/CustomersPage.tsx');
const cases=read('src/screens/CustomerCare/Cases/CasesPage.tsx');
const dashboard=read('src/screens/CustomerCare/Dashboard/DashboardPage.tsx');
const endpoint=read('../backend/src/KidsfitCRM.Api/Features/CustomerCare/CustomerCareEndpoints.cs');
const actions=read('src/components/common/admin-list-ui.tsx');

test('CSKH list filters reuse AppSelect and preserve API enums and pagination',()=>{
  for(const ui of [school,cases]){
    assert.match(ui,/<AppSelect /);
    assert.doesNotMatch(ui,/filters=\{<select/);
    assert.match(ui,/setPage\(1\)/);
    assert.match(ui,/onValueChange=\{next=>/);
  }
  for(const value of ['ALL','HAS_TICKET','SUPPORTED','NOT_SUPPORTED'])assert.match(school,new RegExp(value));
  for(const value of ['ALL','OPEN','IN_PROGRESS','RESOLVED'])assert.match(cases,new RegExp(value));
});
test('Four school actions use distinct shared tones with accessible labels',()=>{
  assert.match(actions,/type IconActionTone = 'green' \| 'blue' \| 'amber' \| 'red' \| 'neutral'/);
  assert.match(actions,/amber: 'border-amber-500/);
  for(const [icon,tone] of [['Eye',null],['SquarePen','blue'],['History','neutral'],['Ticket','amber']]){
    assert.match(school,new RegExp('icon=\\{'+icon+'\\}'+(tone?' tone="'+tone+'"':'')));
  }
  assert.match(school,/aria-label|label=\{'Xem thông tin '/);
  assert.match(school,/AppStatusBadge status="OPEN"/);
  assert.equal((school.match(/<col style=\{\{width:/g)??[]).length,5);
});
test('Ticket status uses reusable accessible status badge not AdminStatusBadge',()=>{
  assert.match(cases,/AppStatusBadge status=\{t.status\}/);
  assert.doesNotMatch(cases,/AdminStatusBadge/);
  assert.match(cases,/status==='IN_PROGRESS'/);
});
test('CSKH dashboard preserves five current KPIs and adds two authorized real-data charts',()=>{
  assert.match(dashboard,/\/care\/summary/);
  assert.match(dashboard,/\/care\/dashboard\/report\?period=/);
  assert.match(dashboard,/AppMonthPicker/);
  assert.match(dashboard,/allowAll=\{false\}/);
  assert.match(dashboard,/<LineChart/);
  assert.match(dashboard,/<PieChart/);
  for(const metric of ['schools','open_tickets','waiting_checkee','due_calls','resolved_tickets'])assert.match(dashboard,new RegExp(metric));
  assert.match(dashboard,/queryKey:\['care-dashboard-report',apiBase,token,period\]/);
  assert.match(dashboard,/void query.refetch\(\);void report.refetch\(\)/);
});
test('Read-only ticket reporting is scoped to assigned contracts and real resolved-at timestamps',()=>{
  assert.match(endpoint,/MapGet\("\/care\/dashboard\/report", DashboardReport\)\.RequireAuthorization\(Permissions.SchoolSupportManage\)/);
  const report=endpoint.slice(endpoint.indexOf('public static async Task<IResult> DashboardReport('),endpoint.indexOf('public static async Task<IResult> LogCall('));
  assert.match(report,/CareAccess\(http, db, ct\)/);
  assert.match(report,/Assigned\(db, access\)\.Any\(c => c.Id == t.ContractId\)/);
  assert.match(report,/ResolvedAt\.HasValue/);
  assert.match(report,/ResolvedAt\.Value >= from/);
  assert.match(report,/DateTime\.SpecifyKind\(month.AddHours\(-7\), DateTimeKind.Utc\)/);
  assert.match(report,/status_breakdown = breakdown/);
  assert.match(report,/ticket_trend = trend/);
  assert.doesNotMatch(report,/\.Take\(/);
});
