import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const backend = file => readFileSync(resolve(import.meta.dirname, '../../backend/src/KidsfitCRM.Api', file), 'utf8');
const frontend = file => readFileSync(resolve(import.meta.dirname, '../src', file), 'utf8');

test('Sales fee-based signed-contract report does not require a CHECKEE catalog package', () => {
  const ui = frontend('components/crm/channel-sales-view.tsx');
  const types = frontend('lib/channel-sales.ts');
  const dto = backend('Features/ChannelSalesContracts.cs');
  assert.doesNotMatch(ui, /if \(!packages\.length\) throw/);
  assert.doesNotMatch(ui, /product_package_id: packages\[0\]\.id/);
  assert.doesNotMatch(ui, /packages=\{workspace\.packages\}/);
  assert.doesNotMatch(types, /product_package_id/);
  assert.doesNotMatch(dto, /ProductPackageId/);
  assert.match(ui, /maintenance_fee: maintenance/);
  assert.match(ui, /setup_fee: setup/);
  assert.match(ui, /evidence_id: response\.data\.id/);
});

test('Backend requires manual fee components and validates totals', () => {
  const code = backend('Features/ChannelSalesActions.cs');
  assert.match(code, /if \(calculatedTotal <= 0 \|\| calculatedTotal != request\.TotalValue\)/);
  assert.match(code, /if \(!hasContractFees\)/);
  assert.doesNotMatch(code, /CheckeeProductPackage|ProductPackageId|product_package_id/);
  assert.match(code, /if \(contractProof is null\)/);
  assert.match(code, /Status = schoolContract \? "PENDING_REVIEW" : "ACTIVE"/);
});

test('Latest migration retires the unused catalog while retaining fee descriptions', () => {
  const entity = backend('Domain/ChannelSalesEntities.cs');
  const snapshot = backend('Infrastructure/Migrations/KidsfitDbContextModelSnapshot.cs');
  const migration = backend('Infrastructure/Migrations/20261113230000_RemoveLegacyCheckeePackages.cs');
  assert.doesNotMatch(entity, /ProductPackageId|CheckeeProductPackage/);
  assert.doesNotMatch(snapshot, /ProductPackageId|CheckeeProductPackage/);
  assert.match(migration, /migrationBuilder\.DropForeignKey/);
  assert.match(migration, /migrationBuilder\.DropColumn/);
  assert.match(migration, /migrationBuilder\.DropTable/);
  assert.doesNotMatch(migration, /DeleteData|TRUNCATE/i);
});
