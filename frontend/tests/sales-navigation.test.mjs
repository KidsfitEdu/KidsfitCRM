import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { canonicalSalesView, legacySalesWorkflowTab, salesMenuIds } from '../src/config/sales-navigation.ts';

const root = resolve(import.meta.dirname, '..');
const read = name => readFileSync(resolve(root,name),'utf8');

test('Employee and collaborator Sales share exactly six canonical menu entries', () => {
  assert.equal(salesMenuIds.length, 6);
  assert.equal(new Set(salesMenuIds).size, 6);
  assert.deepEqual(salesMenuIds,[
    'role-sales-staff-dashboard',
    'role-sales-staff-schools',
    'role-sales-staff-customers',
    'role-sales-staff-activities',
    'role-sales-staff-proposals',
    'role-sales-staff-income',
  ]);
  const app = read('src/components/crm/crm-app.tsx');
  assert.match(app, /isSales \? salesMenuIds\.includes\(item\.id\)/);
  assert.match(app, /currentView\.startsWith\('role-sales-staff-'\)/);
});

test('Every legacy collaborator deep link resolves without losing invitation or extension context', () => {
  const aliases = {
    'role-collaborator-dashboard':'role-sales-staff-dashboard',
    'role-collaborator-schools':'role-sales-staff-schools',
    'role-collaborator-proposals':'role-sales-staff-proposals',
    'role-collaborator-invitations':'role-sales-staff-customers',
    'role-collaborator-approaches':'role-sales-staff-activities',
    'role-collaborator-extensions':'role-sales-staff-activities',
    'role-collaborator-income':'role-sales-staff-income',
  };
  for (const [source,target] of Object.entries(aliases)) assert.equal(canonicalSalesView(source),target);
  assert.equal(legacySalesWorkflowTab('role-collaborator-invitations'),'invitations');
  assert.equal(legacySalesWorkflowTab('role-collaborator-extensions'),'extensions');
  assert.equal(legacySalesWorkflowTab('role-sales-staff-activities'),undefined);
  const app = read('src/components/crm/crm-app.tsx');
  assert.match(app, /isSales \? canonicalSalesView\(requested\) : requested/);
  assert.match(app, /legacySalesWorkflowTab\(requested\)/);
});

test('Sales pages use focused customer subsets and retain original authorized actions', () => {
  const focus = read('src/components/roles/SalesFocusPage.tsx');
  const view = read('src/components/crm/channel-sales-view.tsx');
  assert.match(focus, /title: 'Trường của tôi'/);
  assert.match(focus, /title: 'Tiếp cận & tư vấn'/);
  assert.match(focus, /id:'invitations'/);
  assert.match(focus, /id:'extensions'/);
  assert.match(focus, /onRegister=\{props\.onRegister\}/);
  assert.match(focus, /onAddActivity=\{props\.onAddActivity\}/);
  assert.match(focus, /onReportContract=\{props\.onReportContract\}/);
  assert.match(view, /mode === 'all' && <section/);
  assert.match(view, /customer\.can_manage_approach/);
  assert.match(view, /canRegister=\{mode === 'all' && canRegister\}/);
});

test('Shared Admin/Manager paths remain unchanged and embedded compact mode is opt-in', () => {
  const role = read('src/components/roles/RoleOperationsPage.tsx');
  const channel = read('src/components/crm/channel-operations.tsx');
  const school = read('src/components/crm/school-operations.tsx');
  assert.match(role, /if \(profile === 'SalesStaff'\)/);
  assert.match(role, /const sections: Record<string, SectionDefinition> = rolePageSections\[profile\]/);
  assert.match(channel, /compactOperations = false/);
  assert.match(school, /compactHeader = false/);
  assert.match(school, /compactHeader && active === 'proposals'/);
});

test('Sales underline tabs and proposal table retain shared role layouts', () => {
  const focus = read('src/components/roles/SalesFocusPage.tsx');
  const operations = read('src/components/crm/channel-operations.tsx');
  const directory = read('src/components/crm/school-directory.tsx');
  const proposals = read('src/components/crm/school-operations.tsx');
  const table = read('src/components/roles/SalesProposalTable.tsx');
  assert.match(focus, /lg:w-\[30%\]/);
  assert.match(focus, /border-b-\[3px\] bg-transparent/);
  assert.match(focus, /border-\[#1b5e20\]/);
  assert.match(focus, /rounded-2xl border border-border\/80 bg-white shadow-sm/);
  assert.doesNotMatch(focus, /rounded-t-\[24px\]/);
  assert.match(focus, /actions=\{canCreateProposal \?/);
  assert.match(focus, /embeddedSalesTable=\{section === 'proposals' \|\| isInvitations \|\| isExtensions\}/);
  assert.match(focus, /embedded=\{section === 'customers' \|\| section === 'activities'\}/);
  assert.match(operations, /!compactOperations && visiblePanel !== 'customers'/);
  assert.match(operations, /registrationIconOnly=\{compactOperations\}/);
  assert.match(directory, /UserRoundPlus/);
  assert.match(directory, /aria-label=\{registrationIconOnly \?/);
  assert.match(proposals, /embeddedSalesTable && active === 'proposals'/);
  assert.match(table, /<table/);
  assert.match(table, /aria-label="Đặt lại bộ lọc"/);
  assert.doesNotMatch(table, /Thêm mới/);
  assert.match(focus, />Thêm mới<\/AppButton>/);
  assert.match(proposals, /proposalActionRef\.current = \{ open: openProposal \}/);
  assert.match(proposals, /embeddedSalesTable && \(active === 'invitations' \|\| active === 'extensions'\)/);
});

test('Sales actions and footer pagination remain accessible and scoped', () => {
  const focus = read('src/components/roles/SalesFocusPage.tsx');
  const sales = read('src/components/crm/channel-sales-view.tsx');
  const dashboard = read('src/components/roles/SalesDashboard.tsx');
  const operations = read('src/components/crm/school-operations.tsx');
  const proposals = read('src/components/roles/SalesProposalTable.tsx');
  const finance = read('src/components/crm/channel-operations.tsx');
  const pager = read('src/components/common/app-pagination.tsx');
  assert.ok(focus.includes("section === 'customers'"));
  assert.ok(focus.includes("min-w-0 bg-white dark:bg-card"));
  assert.ok(sales.includes('pageSizeOptions={[10,20,50,100]}'));
  assert.ok(sales.includes('total={customers.length}'));
  assert.ok(sales.includes('aria-label={`Cập nhật tư vấn ${customer.display_name}`}'));
  assert.ok(sales.includes('aria-label={`Báo hợp đồng ${customer.display_name}`}'));
  assert.ok(dashboard.includes('aria-label={`Cập nhật tư vấn ${customer.display_name}`}'));
  assert.ok(operations.includes('Nhận trường ${x.school_name}'));
  assert.ok(operations.includes('Từ chối gia hạn ${x.school_name}'));
  assert.ok(operations.includes('<AppPagination page={preview ? 1 : page}'));
  assert.ok(proposals.includes('fixedPageSize'));
  assert.ok(finance.includes('total={data.ledger.length}'));
  assert.ok(finance.includes('total={data.payouts.length}'));
  assert.ok(pager.includes('fixedPageSize'));
});
