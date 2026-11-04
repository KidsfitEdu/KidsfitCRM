import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const file = (name) => resolve(root, name);
const read = (name) => readFileSync(file(name), 'utf8');
const profileSections = {
  Admin: ['Dashboard','Schools','Proposals','Personnel','Capacities','Policies','Reports','CareAssignments'],
  SalesManager: ['Dashboard','Proposals','Allocations','Progress','Contracts','Extensions','Team'],
  SalesStaff: ['Dashboard','Schools','Customers','Activities','Proposals','Income'],
  Collaborator: ['Dashboard','Schools','Proposals','Invitations','Approaches','Extensions','Income'],
  Board: ['Dashboard','Overdue','Disputes','Policies'],
  Accounting: ['Dashboard','Revenue'],
  CustomerCare: ['Dashboard','Cases','Customers'],
  Checkee: ['Dashboard','Verification','Support'],
};

test('All 40 active role menu pages exist and are compiled from src/screens', () => {
  let total = 0;
  for (const [profile, screens] of Object.entries(profileSections)) {
    for (const screen of screens) {
      const source = profile === 'Admin' && screen === 'CareAssignments'
        ? 'src/screens/Admin/CareAssignments/CareAssignmentsPage.tsx'
        : 'src/screens/' + profile + '/' + screen + '/' + screen + 'Page.tsx';
      assert.ok(existsSync(file(source)), 'Missing role page: ' + source);
      const text = read(source);
      assert.match(text, new RegExp('export function ' + screen + 'Page\\b'));
      total += 1;
    }
  }
  assert.equal(total, 40);
});

test('Active navigation targets match role page registry and preserve aliases', () => {
  const nav = read('src/config/navigation.ts');
  const config = read('src/config/role-pages.ts');
  const known = [...nav.matchAll(/\{ id: '([^']+)', label:/g)].map(match => match[1]);
  assert.equal(known.length, 40, 'Expected 40 active role navigation entries');
  assert.equal(new Set(known).size, known.length, 'Menu IDs must be unique');
  for (const [profile, screens] of Object.entries(profileSections)) {
    if(profile === 'Admin') continue;
    for(const screen of screens) {
      const id = profile === 'SalesManager'
        ? 'manager-' + screen.toLowerCase()
        : 'role-' + profile.replace(/[A-Z]/g,(c,i) => (i ? '-' : '') + c.toLowerCase()) + '-' + screen.toLowerCase();
      assert.ok(known.includes(id), 'Navigation missing: ' + id);
      assert.ok(config.includes(screen.toLowerCase() + ':'), 'Role page config missing: ' + profile + '/' + screen);
    }
  }
});

test('CHECKEE has verification and separate technical support menus', () => {
  const navigation = read('src/config/navigation.ts');
  const routes = read('src/config/routes.ts');
  const page = read('src/screens/Checkee/Verification/VerificationPage.tsx');
  const dashboard = read('src/screens/Checkee/Dashboard/DashboardPage.tsx');
  assert.equal((navigation.match(/\{ id: 'role-checkee-(dashboard|verification|support)', label:/g) ?? []).length, 3);
  assert.match(routes, /canonicalCheckeeView/);
  assert.match(page, /<AdminListPanel>/);
  assert.match(page, /<AppDrawer/);
  assert.match(page, /<ConfirmDialog/);
  assert.match(page, /<AppPagination/);
  assert.match(page, /\/checkee\/verifications/);
  assert.match(dashboard, /\/checkee\/verifications\?page=1&page_size=1/);
});

test('No obsolete workspace compatibility imports remain in CrmApp', () => {
  const app = read('src/components/crm/crm-app.tsx');
  assert.ok(!app.includes('@/components/crm/roles/'), 'Legacy role import found');
  assert.ok(!app.includes('@/components/crm/admin/admin-workspace'), 'Legacy admin import found');
  assert.ok(!app.includes('@/components/crm/sales-manager-workspace'), 'Legacy manager import found');
  for (const profile of Object.keys(profileSections)) {
    assert.match(app, new RegExp('@/screens/' + profile + '/' + profile + 'Workspace'));
  }
});

test('Legacy re-export files removed only after moving their consumers', () => {
  const removed = [
    'components/crm/admin/admin-workspace.tsx',
    'components/crm/admin/admin-list-ui.tsx',
    'components/crm/admin/admin-capacity-management.tsx',
    'components/crm/sales-manager-workspace.tsx',
    ...['accounting','board','checkee','collaborator','customer-care','sales-staff']
      .map(role=>'components/crm/roles/'+role+'-workspace.tsx'),
  ];
  for(const path of removed)assert.equal(existsSync(file(path)),false,'Orphan compatibility file: '+path);
});


test('src/app route tree and src/screens have no conflicting legacy directories', () => {
  for (const route of ['src/app/layout.tsx','src/app/page.tsx','src/app/globals.css','src/app/crm/[view]/page.tsx']) {
    assert.ok(existsSync(file(route)), 'Missing Vinext route asset: ' + route);
  }
  assert.equal(existsSync(file('app')), false, 'Legacy root app/ must be absent');
  assert.equal(existsSync(file('src/pages')), false, 'Legacy src/pages must be absent');
  const demoEntry = read('demo/main.tsx');
  assert.match(demoEntry, /\.\.\/src\/app\/globals\.css/);
  const config = read('components.json');
  assert.match(config, /src\/app\/globals\.css/);
});

test('Manager contract review reuses existing drawer, table, and mandatory confirmation', () => {
  const page = read('src/screens/SalesManager/Contracts/ContractsPage.tsx');
  const team = read('src/screens/SalesManager/Team/TeamPage.tsx');
  const dashboard = read('src/screens/SalesManager/Dashboard/DashboardPage.tsx');
  const sales = read('src/components/roles/SalesContractRevisions.tsx');
  assert.match(page, /<AdminListPanel>/);
  assert.match(page, /<AppDrawer/);
  assert.match(page, /<ConfirmDialog/);
  assert.match(page, /confirmLabel="Xác nhận chuyển"/);
  assert.match(page, /Duyệt & gửi CHECKEE/);
  assert.match(page, /<th className="px-5 py-4">SALES<\/th>/);
  assert.doesNotMatch(page, /Hạn xử lý/);
  assert.match(page, /\/school-contracts\/reviews/);
  assert.match(team, /\/manager\/team/);
  assert.doesNotMatch(team, /ChannelOperations/);
  assert.match(dashboard, /\/manager\/overview/);
  assert.match(sales, /\/school-contracts\/\$\{contractId\}\/review-detail/);
  assert.match(sales, /aria-label="Thay thế file hợp đồng"/);
  assert.doesNotMatch(sales, /sales-contract-revisions/);
});

test('Board legacy reports route remains an alias, not an active fifth menu item', () => {
  const routes = read('src/config/routes.ts');
  const nav = read('src/config/navigation.ts');
  const app = read('src/components/crm/crm-app.tsx');
  assert.match(routes, /canonicalBoardView/);
  assert.match(routes, /role-board-oversight/);
  assert.doesNotMatch(nav, /\{ id: 'role-board-oversight', label:/);
  assert.match(app, /canonicalBoardView/);
  assert.ok(existsSync(file('src/screens/Board/Oversight/OversightPage.tsx')));
});

test('CSKH school page separates profile, recording and history into three icon actions', () => {
  const source = read('src/screens/CustomerCare/Customers/CustomersPage.tsx');
  assert.match(source, /icon=\{Eye\}/);
  assert.match(source, /icon=\{SquarePen\}/);
  assert.match(source, /icon=\{History\}/);
  assert.match(source, /SchoolProfileDetails units=\{details\.data\.school_units\}/);
  assert.match(source, /title="Cập nhật nhật ký hướng dẫn"/);
  assert.match(source, /title="Lịch sử hỗ trợ"/);
  assert.match(source, /next_follow_up_at:null/);
  assert.doesNotMatch(source, /Lịch hỗ trợ tiếp theo/);
  assert.doesNotMatch(source, /Lịch sử phân công/);
  assert.doesNotMatch(source, /details\.data\.handovers\.map/);
});

test('CSKH and CHECKEE use distinct ticket closure roles and shared support timeline', () => {
  const care = read('src/screens/CustomerCare/Cases/CasesPage.tsx');
  const checkee = read('src/screens/Checkee/Support/SupportPage.tsx');
  const common = read('src/components/common/support-ticket-detail.tsx');
  assert.match(care, /title="Chi tiết ticket lỗi phần mềm"/);
  assert.match(care, /Xác nhận kết quả với nhà trường/);
  assert.match(care, /Chờ CSKH xác nhận/);
  assert.match(care, /selected\.checkee_responded_at/);
  assert.match(care, /<SupportTicketTimeline entries=\{selected\.activities\}/);
  assert.match(checkee, /title="Xử lý lỗi kỹ thuật"/);
  assert.match(checkee, /Hoàn tất kỹ thuật/);
  assert.match(checkee, /Lưu kết quả xử lý/);
  assert.match(checkee, /technicalStatus==='COMPLETED'/);
  assert.doesNotMatch(checkee, /type="checkbox"/);
  assert.match(checkee, /<SupportTicketTimeline entries=\{selected\.activities\}/);
  assert.match(common, /author_role/);
});
