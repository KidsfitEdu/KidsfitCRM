import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, 'src', path), 'utf8');

const statusFilters = [
  'components/crm/school-operations.tsx',
  'components/crm/channel-sales-view.tsx',
  'components/crm/school-directory.tsx',
  'components/roles/ManagerWorklists.tsx',
  'components/roles/SalesProposalTable.tsx',
  'components/roles/SalesInvitationList.tsx',
  'screens/Admin/Personnel/PersonnelPage.tsx',
  'screens/Admin/Proposals/ProposalsPage.tsx',
  'screens/Admin/Policies/PoliciesPage.tsx',
  'screens/Checkee/Verification/VerificationPage.tsx',
  'screens/SalesManager/Contracts/ContractsPage.tsx',
  'screens/SalesManager/Team/TeamPage.tsx',
];

test('shared status filters use the branded popup instead of native browser options', () => {
  const component = read('components/common/app-status-filter.tsx');
  assert.match(component, /<SelectContent/);
  assert.match(component, /<SelectItem/);
  assert.match(component, /aria-label=\{ariaLabel\}/);
  assert.match(component, /onValueChange/);
  assert.doesNotMatch(component, /<select\b/i);

  for (const path of statusFilters) {
    const screen = read(path);
    assert.match(screen, /<AppStatusFilter\b/, path);
    assert.match(screen, /onValueChange=/, path);
    assert.match(screen, /options=\{/, path);
  }
});

test('the CHECKEE verification filter retains API values and reset logic', () => {
  const checkee = read('screens/Checkee/Verification/VerificationPage.tsx');
  for (const value of ['ALL', 'PENDING', 'DISPUTED', 'CONFIRMED']) {
    assert.match(checkee, new RegExp('value:?' + '(?:\\s*)' + '["\\\']' + value + '["\\\']'), value);
  }
  assert.match(checkee, /setStatus\('ALL'\)/);
  assert.match(checkee, /setPage\(1\)/);
  assert.match(checkee, /URLSearchParams\(\{page:/);
});

test('Admin personnel forms stay native until separately migrated and verified', () => {
  const personnel = read('screens/Admin/Personnel/PersonnelPage.tsx');
  assert.match(personnel, /<AppStatusFilter\b/);
  assert.match(personnel, /<AppNativeSelect\s+id="admin-new-org"/);
  assert.match(personnel, /<AppNativeSelect\s+id="admin-edit-role"/);
});
