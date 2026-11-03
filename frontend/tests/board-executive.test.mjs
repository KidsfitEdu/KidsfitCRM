import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('Board role sections use dedicated executive pages and preserve existing navigation', () => {
  const routes = ['Dashboard','Oversight','Overdue','Disputes','Policies'];
  for (const section of routes) {
    const page = read(`screens/Board/${section}/${section === 'Dashboard' ? 'Dashboard' : section}Page.tsx`);
    assert.match(page, new RegExp(`Board(?:Dashboard|Reports|Overdue|Disputes|Policies)Page`));
    assert.doesNotMatch(page, /RoleOperationsPage/);
  }
  const source = read('screens/Board/BoardWorkspace.tsx');
  for (const section of ['dashboard','oversight','overdue','disputes','policies'])
    assert.match(source, new RegExp(section + ':'));
});

test('Board data uses existing authorized APIs and avoids unapproved rates', () => {
  const source = read('screens/Board/board-data.ts');
  assert.match(source, /\/school-operations\/report\?period=/);
  assert.match(source, /\/school-operations\?page=/);
  assert.doesNotMatch(source, /\.rate_percent\s*=|30%/);
});

test('Overdue and dispute actions use server permission flags and shared dialog', () => {
  const overdue = read('screens/Board/BoardOverduePage.tsx');
  const disputes = read('screens/Board/BoardDisputesPage.tsx');
  assert.match(overdue, /can_manager_review/);
  assert.match(overdue, /can_review/);
  assert.match(disputes, /can_resolve/);
  assert.match(overdue, /SchoolActionDialog/);
  assert.match(disputes, /SchoolActionDialog/);
  assert.match(disputes, /\/school-disputes\//);
  assert.match(overdue, /\/school-extensions\//);
  assert.match(overdue, /\/school-proposals\//);
  assert.match(overdue, /AppPagination/);
  assert.match(disputes, /AppPagination/);
});

test('Board policy screens use saved policy versions, not stale two-extension text', () => {
  const source = read('screens/Board/BoardPoliciesPage.tsx');
  const shared = read('components/crm/school-operations.tsx');
  assert.match(source, /max_extension_count/);
  assert.match(source, /max_extension_days/);
  assert.match(source, /decision_reference/);
  assert.doesNotMatch(shared, /tối đa 2 lần và 14 ngày/);
});

test('Board has four menu items while historic reports route still loads dashboard', () => {
  const nav = read('config/navigation.ts');
  const routes = read('config/routes.ts');
  const workspace = read('screens/Board/BoardWorkspace.tsx');
  const dashboard = read('screens/Board/BoardDashboardPage.tsx');
  assert.doesNotMatch(nav, /\{ id: 'role-board-oversight', label:/);
  assert.match(nav, /\{ id: 'role-board-overdue', label: 'Hồ sơ quá hạn'/);
  assert.match(routes, /canonicalBoardView/);
  assert.match(routes, /'role-board-oversight' \? 'role-board-dashboard'/);
  assert.match(workspace, /oversight: DashboardPage/);
  assert.match(dashboard, /Đối soát doanh thu theo kỳ/);
});

test('Board queues share Sales search toolbar, icon actions and real server paging', () => {
  const overdue = read('screens/Board/BoardOverduePage.tsx');
  const disputes = read('screens/Board/BoardDisputesPage.tsx');
  const policies = read('screens/Board/BoardPoliciesPage.tsx');
  for (const source of [overdue, disputes, policies]) {
    assert.match(source, /AdminListToolbar/);
    assert.match(source, /AdminIconAction/);
  }
  for (const source of [overdue, disputes]) {
    assert.match(source, /pageSizeOptions=\{\[10,20,50,100\]\}/);
    assert.match(source, /page_size=/);
    assert.match(source, /encodeURIComponent\(search\)/);
    assert.doesNotMatch(source, /<AppButton[^>]*>Xử lý<\/AppButton>/);
  }
  assert.match(policies, /Chi tiết chính sách/);
  assert.match(policies, /Tìm kiếm và phân trang áp dụng trên tối đa 100 phiên bản/);
  assert.match(policies, /<AppPagination/);
});

test('Director policy lifecycle uses audited API and hides edits of non-drafts', () => {
  const screen = read('screens/Board/BoardPoliciesPage.tsx');
  const editor = read('screens/Board/PolicyEditorDialog.tsx');
  assert.match(screen, /channel_sales\.school\.workflow_policy\.manage/);
  assert.match(screen, /p\.status==='DRAFT'/);
  assert.match(screen, /<PolicyEditorDialog/);
  assert.match(screen, /<ConfirmDialog/);
  assert.match(screen, /\/school-workflow-policies/);
  assert.match(screen, /canManage&&<AppButton/);
  assert.doesNotMatch(screen, /Chính sách đang áp dụng<\/h3>/);
  assert.doesNotMatch(screen, /Làm mới danh sách chính sách/);
  assert.match(editor, /max_extension_days:7,max_extension_count:3,max_total_extension_days:21/);
});
