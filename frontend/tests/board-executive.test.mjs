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
