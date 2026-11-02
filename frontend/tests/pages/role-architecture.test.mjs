import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const file = (name) => resolve(root, name);
const read = (name) => readFileSync(file(name), 'utf8');
const profileSections = {
  Admin: ['Dashboard','Schools','Proposals','Personnel','Capacities','Policies','Reports'],
  SalesManager: ['Dashboard','Proposals','Allocations','Progress','Contracts','Extensions','Team'],
  SalesStaff: ['Dashboard','Schools','Customers','Activities','Proposals','Income'],
  Collaborator: ['Dashboard','Schools','Proposals','Invitations','Approaches','Extensions','Income'],
  Board: ['Dashboard','Oversight','Overdue','Disputes','Policies'],
  Accounting: ['Dashboard','Revenue'],
  CustomerCare: ['Dashboard','Handover','Cases','Customers','Followup'],
  Checkee: ['Dashboard','Verification','Reconciliation','Disputes','History'],
};

test('All 44 active role menu pages exist and are compiled from src/pages', () => {
  let total = 0;
  for (const [profile, screens] of Object.entries(profileSections)) {
    for (const screen of screens) {
      const source = 'src/screens/' + profile + '/' + screen + '/' + screen + 'Page.tsx';
      assert.ok(existsSync(file(source)), 'Missing role page: ' + source);
      const text = read(source);
      assert.match(text, new RegExp('export function ' + screen + 'Page\\b'));
      total += 1;
    }
  }
  assert.equal(total, 44);
});

test('Navigation targets and role-to-page config preserve legacy IDs', () => {
  const nav = read('src/config/navigation.ts');
  const config = read('src/config/role-pages.ts');
  const known = [...nav.matchAll(/\{ id: '([^']+)', label:/g)].map(match => match[1]);
  assert.equal(known.length, 44, 'Expected 44 active role navigation entries');
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
  assert.match(sales, /\/school-contracts\/my-revisions/);
});
