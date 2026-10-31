import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const adminPages = [
  'Dashboard/DashboardPage.tsx',
  'Schools/SchoolsPage.tsx',
  'Proposals/ProposalsPage.tsx',
  'Personnel/PersonnelPage.tsx',
  'Capacities/CapacitiesPage.tsx',
  'Policies/PoliciesPage.tsx',
  'Reports/ReportsPage.tsx',
].map((path) => 'src/screens/Admin/' + path);

test('Admin page headers do not expose manual refresh buttons', () => {
  for (const path of adminPages) {
    const source = read(path);
    assert.doesNotMatch(source, />Làm mới<\/AppButton>/, path);
  }
  const proposals = read('src/screens/Admin/Proposals/ProposalsPage.tsx');
  const capacities = read('src/screens/Admin/Capacities/CapacitiesPage.tsx');
  assert.match(proposals, /useEffect\(\(\) => \{void reload\(\);\},\[reload\]\)/);
  assert.match(capacities, /useEffect\(\(\) => \{void reload\(\);\},\[reload\]\)/);
  assert.match(proposals, /onReset=/);
  assert.match(capacities, /onReset=/);
});

test('Admin proposals hide synthetic school codes but retain real codes and raw editing', () => {
  const source = read('src/screens/Admin/Proposals/ProposalsPage.tsx');
  assert.equal(source.split("!p.school_code.startsWith('SEED-SCH-')").length - 1, 2);
  assert.match(source, /school_code:editFields\.school_code/);
  assert.match(source, /editFields\.school_code/);
  assert.match(source, /workflowLabels\[p.status\]/);
  assert.match(source, /appNotice\.success\(approve\?/);
});

test('All Admin views report server errors through shared toast; form errors stay inline', () => {
  for (const path of adminPages) {
    const source = read(path);
    assert.match(source, /appNotice\.error/, path);
  }
  const proposals = read('src/screens/Admin/Proposals/ProposalsPage.tsx');
  const schools = read('src/screens/Admin/Schools/SchoolsPage.tsx');
  const capacity = read('src/screens/Admin/Capacities/CapacitiesPage.tsx');
  assert.match(proposals, /<FormError>\{reasonError\}<\/FormError>/);
  assert.match(schools, /<FormError>\{formErrors\[k\]\}<\/FormError>/);
  assert.match(capacity, /<FormError id="capacity-limit-error">/);
});

test('Shared school directory applies new notification behavior only to Admin', () => {
  const source = read('src/components/crm/school-directory.tsx');
  assert.match(source, /if \(adminMode\) appNotice\.success/);
  assert.match(source, /if \(adminMode\) appNotice\.error/);
  assert.match(source, /!adminMode && notice &&/);
  assert.match(source, /!adminMode && upload\.error &&/);
  assert.match(source, /preview\.warnings\.map/);
  assert.match(source, /setPreview\(result\)/);
});
