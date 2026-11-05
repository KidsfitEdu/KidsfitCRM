import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test('Accounting filters verified contracts with owner id and uses scoped owner options', () => {
  const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.match(ui, /financial_view: financialView/);
  assert.match(ui, /params\.set\('owner_user_id', ownerUserId\)/);
  assert.match(ui, /setOwners\(result\.owners\)/);
  assert.match(ui, /owner\.id/);
  assert.match(ui, /value=\{String\(owner\.id\)\}/);
  assert.match(ui, /Tất cả người phụ trách/);
  assert.match(ui, /Hợp đồng đã xác minh/);
  assert.match(ui, /Lịch sử tài chính/);
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
