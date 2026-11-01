import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, 'src', path), 'utf8');

test('Admin workflows use shared branded dialog and drawer shells', () => {
  const cases = {
    'screens/Admin/Personnel/PersonnelPage.tsx': ['<AppDialog', '<AppDrawer'],
    'screens/Admin/Schools/SchoolsPage.tsx': ['<AppDialog'],
    'screens/Admin/Capacities/CapacitiesPage.tsx': ['<AppDialog', '<ConfirmDialog'],
    'screens/Admin/Proposals/ProposalsPage.tsx': ['<AppDialog', '<AppDrawer'],
  };
  for (const [path, markers] of Object.entries(cases)) {
    const source = read(path);
    for (const marker of markers) assert.ok(source.includes(marker), path + ': ' + marker);
    assert.doesNotMatch(source, /<Dialog(?:\s|>)/, path);
  }
});

test('CRM school details and work history reuse the shared drawer shell', () => {
  for (const path of [
    'components/crm/school-directory.tsx',
    'components/crm/school-operations.tsx',
    'components/crm/channel-operations.tsx',
  ]) {
    assert.match(read(path), /<AppDrawer\s/, path);
  }
  assert.doesNotMatch(read('components/crm/school-directory.tsx'), /<Dialog(?:\s|>)/);
  assert.doesNotMatch(read('components/crm/school-operations.tsx'), /<Dialog(?:\s|>)/);
});

test('Sales workflows use AppDialog rather than a second UI dialog implementation', () => {
  const source = read('components/crm/channel-sales-view.tsx');
  assert.match(source, /function SalesFormDialog/);
  assert.match(source, /<AppDialog open/);
  assert.doesNotMatch(source, /<UiDialog\s/);
  assert.equal((source.match(/<SalesFormDialog\s/g) ?? []).length, 4);
});
