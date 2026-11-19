import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const read=p=>readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const dashboard=read('src/screens/Admin/Dashboard/DashboardPage.tsx');
const nav=read('src/config/navigation.ts');
const shell=read('src/components/crm/crm-app.tsx');
const workspace=read('src/screens/Admin/AdminWorkspace.tsx');
const endpoint=read('../backend/src/KidsfitCRM.Api/Features/SchoolOperationsEndpoints.cs');
test('Admin dashboard merges report KPIs and uses shared reporting-month control',()=>{
  assert.match(dashboard,/fetchAdminReport\(apiBase,token,period\)/);
  assert.match(dashboard,/AppMonthPicker label="Kỳ báo cáo vận hành"/);
  assert.match(dashboard,/allowAll=\{false\}/);
  assert.match(dashboard,/AppStatCard/);
  assert.match(dashboard,/Đề xuất quá hạn/);
  assert.match(endpoint,/pending_admin_proposals = await Proposals\(db, a\)\.CountAsync\(x => x.Status == "PENDING_ADMIN"/);
  assert.doesNotMatch(dashboard,/fetchAdminOperations\(apiBase,token,1/);
  assert.match(dashboard,/onSalesNavigate\?\.\(x.view\)/);
  assert.match(dashboard,/Tiếp cận hết hạn trong kỳ/);
});
test('Operations chart is based on scoped actual records and covers six local months',()=>{
  assert.match(endpoint,/for \(var offset = 5; offset >= 0; offset--\)/);
  assert.match(endpoint,/registrations.CountAsync\(x => x.RegisteredAt >= monthStart && x.RegisteredAt < monthEnd/);
  assert.match(endpoint,/contracts.CountAsync\(x => x.SignedOn >= fromDate && x.SignedOn < toDate/);
  assert.match(endpoint,/activity_trend = activityTrend/);
  assert.match(dashboard,/LineChart accessibilityLayer data=\{trend\}/);
  assert.match(dashboard,/dataKey="registrations"/);
  assert.match(dashboard,/dataKey="contracts_signed"/);
});
test('School status mix is explicitly a current snapshot and never historicized',()=>{
  assert.match(dashboard,/Cơ cấu trường học/);
  assert.match(dashboard,/Snapshot quyền bảo vệ tại thời điểm hiện tại/);
  assert.match(endpoint,/school_statuses = a.All/);
  assert.match(dashboard,/PieChart accessibilityLayer/);
});
test('Recent audit summary is scoped and omits private change payloads',()=>{
  assert.match(endpoint,/a.All && a.Has\(Permissions.SchoolDirectoryManage\)/);
  assert.match(endpoint,/db.AuditLogs.AsNoTracking\(\)/);
  assert.match(endpoint,/\.Take\(10\)\.ToArrayAsync\(ct\)/);
  const audit=endpoint.slice(endpoint.indexOf('var recentActivity ='),endpoint.indexOf('// Snapshot of canonical'));
  assert.doesNotMatch(audit,/OldValues|NewValues|IpAddress|UserAgent/);
  assert.match(dashboard,/Nhật ký hoạt động gần đây/);
});
test('Legacy Admin reports route resolves to unified dashboard without sidebar duplication',()=>{
  assert.doesNotMatch(nav,/\{ id: 'admin-reports', label:/);
  assert.match(shell,/isAdmin && view === 'admin-reports' \? 'dashboard'/);
  assert.match(shell,/isAdmin && requested === 'admin-reports' \? 'dashboard'/);
  assert.match(workspace,/section==='admin-reports'&&<DashboardPage/);
});
