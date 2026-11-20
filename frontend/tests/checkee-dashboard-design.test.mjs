import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const read=p=>readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const support=read('src/screens/Checkee/Support/SupportPage.tsx');
const verify=read('src/screens/Checkee/Verification/VerificationPage.tsx');
const dashboard=read('src/screens/Checkee/Dashboard/DashboardPage.tsx');
const api=read('../backend/src/KidsfitCRM.Api/Features/CheckeeVerificationEndpoints.cs');
test('CHECKEE technical filter uses shared AppSelect with stable server enum and paging',()=>{
  assert.match(support,/filters=\{<AppSelect/);
  assert.doesNotMatch(support,/filters=\{<select/);
  assert.match(support,/onValueChange=\{next=>\{setStatus\(next\);setPage\(1\);\}\}/);
  for(const state of ['ALL','OPEN','IN_PROGRESS','RESOLVED'])assert.match(support,new RegExp("value:'"+state+"'"));
});
test('CHECKEE verification and support show semantic badge tones, distinct workflow status',()=>{
  assert.match(support,/AppStatusBadge status=\{x.status\}/);
  assert.match(support,/x.checkee_responded_at\?'warning'/);
  assert.match(support,/x.status==='RESOLVED'\?'CSKH đã đóng'/);
  assert.match(support,/x.checkee_responded_at\?'Chờ CSKH xác nhận'/);
  assert.match(verify,/AppStatusBadge status=\{row.status\}/);
  assert.match(verify,/tone="amber"/);
  assert.match(verify,/tone="green"/);
  assert.match(verify,/DISPUTED: 'Đã phản hồi \/ Cần bổ sung'/);
  assert.match(verify,/kind: 'confirm' \| 'dispute'/);
});
test('CHECKEE dashboard has exactly five cards and real six-month and status charts',()=>{
  const cardDefinitions=dashboard.slice(dashboard.indexOf('const cards=['),dashboard.indexOf('const ticketRows=['));
  assert.equal((cardDefinitions.match(/\{label:'/g)??[]).length,5);
  assert.match(dashboard,/AppMonthPicker/);
  assert.match(dashboard,/allowAll=\{false\}/);
  assert.match(dashboard,/\/checkee\/dashboard\/report\?period=/);
  assert.match(dashboard,/<LineChart/);
  assert.match(dashboard,/<PieChart/);
  assert.match(dashboard,/report.refetch\(\)/);
  assert.match(dashboard,/queryKey:\['checkee-dashboard-report',apiBase,token,period\]/);
});
test('CHECKEE report scopes both datasets to organization and separately checks permissions',()=>{
  assert.match(api,/MapGet\("\/checkee\/dashboard\/report", DashboardReport\)\.RequireAuthorization\(\)/);
  const report=api.slice(api.indexOf('internal static async Task<IResult> DashboardReport('),api.indexOf('internal static async Task<IResult> List('));
  assert.match(report,/ChannelSalesAccess.Load\(db, http.UserId\(\), ct\)/);
  assert.match(report,/access.Has\(Permissions.ChannelSalesReconcile\)/);
  assert.match(report,/access.Has\(Permissions.SchoolTechnicalSupportHandle\)/);
  assert.match(report,/Scope\(db, access\)/);
  assert.match(report,/access.OrganizationIds.Contains\(t.CheckeeOrganizationId.Value\)/);
  assert.match(report,/ReconciliationEvents.AsNoTracking\(\)/);
  assert.match(report,/EventType == "MANAGER_FORWARDED"/);
  assert.match(report,/EventType == "CONFIRMED"/);
  assert.match(report,/Select\(e => e.ReconciliationCaseId\).Distinct\(\).CountAsync\(ct\)/);
  assert.match(report,/CheckeeRespondedAt.HasValue/);
  assert.match(report,/DateTime.SpecifyKind\(periodMonth.AddHours\(-7\), DateTimeKind.Utc\)/);
  assert.doesNotMatch(report,/\.Take\(/);
});

test('CHECKEE contract detail reuses the compact personnel-style drawer and preserves verification actions',()=>{
  const drawer=verify.split('<AppDrawer')[1]?.split('</AppDrawer>')[0]??'';
  assert.match(drawer,/title="Chi tiết hợp đồng"/);
  assert.match(drawer,/bodyClassName="space-y-4 bg-muted\/10"/);
  assert.doesNotMatch(drawer,/wide compactAccountingHeader/);
  assert.match(drawer,/rounded-2xl border border-border bg-card p-4/);
  assert.match(drawer,/grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2/);
  for(const label of ['Địa chỉ trường','Sales phụ trách','Thông tin hợp đồng','Giá trị hợp đồng',
    'Gói dịch vụ','Số học sinh','File hợp đồng đã ký','Lịch thanh toán','Lịch sử xác minh'])
    assert.ok(drawer.includes(label),label);
  for(const icon of ['School','ClipboardList','FileText','CalendarDays','History'])
    assert.match(verify,new RegExp('<'+icon+'\\b'));
  assert.match(drawer,/detail\.data\.reconciliation_status/);
  assert.match(drawer,/channelMoney\(detail\.data\.total_value\)/);
  assert.match(drawer,/viewFile\(file\)/);
  assert.match(drawer,/detail\.installments\.map/);
  assert.match(drawer,/detail\.history\.map/);
  assert.match(drawer,/eventLabels\[entry\.event_type\]/);
  assert.match(drawer,/detail\?\.data\.can_feedback/);
  assert.match(drawer,/detail\?\.data\.can_verify/);
  assert.match(drawer,/openFeedback\(detail\.data\.id\)/);
  assert.match(drawer,/openConfirm\(detail\.data\.id\)/);
  assert.match(verify,/onConfirm=\{\(\) => \{if\(confirmId !== null\)void command\(confirmId,'confirm'/);
  assert.match(verify,/if\(feedbackId !== null\)void command\(feedbackId,'dispute'/);
});
