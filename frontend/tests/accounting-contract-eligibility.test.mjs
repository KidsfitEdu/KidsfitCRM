import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test('Accounting contract filters use server-scoped verified contracts and date-only range', () => {
  const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  const workspace = read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');
  assert.match(ui, /\/accounting\/workspace/);
  assert.match(ui, /params\.set\('service_from',appliedServiceFrom\)/);
  assert.match(ui, /params\.set\('service_to',appliedServiceTo\)/);
  assert.match(workspace, /access\.Contracts\(db\)\.AsNoTracking\(\)/);
  assert.match(workspace, /c\.VerifiedAt\.HasValue/);
  const page = read('src/screens/Accounting/Revenue/RevenuePage.tsx');
  assert.doesNotMatch(page, /AccountingTab|ServiceInterruptionPanel|ContractRenewalAccountingPanel/);
  assert.match(page, /<AccountingContractsPage/);
  assert.doesNotMatch(ui, /<option value="SALES">Nhân viên<\/option>/);
  assert.doesNotMatch(ui, /<option value="COLLABORATOR">CTV<\/option>/);
});

test('Accounting backend enforces verification in both listing and detail', () => {
  const api = read('../backend/src/KidsfitCRM.Api/Features/AccountingContractEndpoints.cs');
  assert.match(api, /access\.Contracts\(db\)\.AsNoTracking\(\)\.Where\(x => x\.VerifiedAt != null\)/);
  assert.match(api, /Where\(x => x\.OwnerUserId == owner_user_id\.Value\)/);
  assert.match(api, /Where\(x => x\.Id == id && x\.VerifiedAt != null\)/);
  assert.match(api, /financial_view/);
});

test('Removing redundant Sales filter does not change backend record permissions', () => {
  const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  const workspace = read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');
  assert.doesNotMatch(ui, /ownerUserId|owners\.map\(|setOwners/);
  assert.match(workspace, /access\.Has\(Permissions\.ChannelSalesCommissionView\)/);
  assert.match(workspace, /access\.Contracts\(db\)\.AsNoTracking\(\)/);
});
