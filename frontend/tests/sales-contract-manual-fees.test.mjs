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
  assert.match(types, /product_package_id\?: number/);
  assert.match(dto, /long\? ProductPackageId/);
  assert.match(ui, /maintenance_fee: maintenance/);
  assert.match(ui, /setup_fee: setup/);
  assert.match(ui, /evidence_id: response\.data\.id/);
});

test('Backend validates manual fee totals and still rejects a missing package for old no-fee clients', () => {
  const code = backend('Features/ChannelSalesActions.cs');
  assert.match(code, /if \(calculatedTotal <= 0 \|\| calculatedTotal != request\.TotalValue\)/);
  assert.match(code, /if \(!hasContractFees && package is null\)/);
  assert.match(code, /if \(request\.ProductPackageId is > 0\)/);
  assert.match(code, /ProductPackageId = package\?\.Id/);
  assert.match(code, /Description = package!\.Name/);
  assert.match(code, /if \(contractProof is null\)/);
  assert.match(code, /Status = schoolContract \? "PENDING_REVIEW" : "ACTIVE"/);
});

test('Optional FK schema preserves historic references and supports nullable manual fee lines', () => {
  const entity = backend('Domain/ChannelSalesEntities.cs');
  const snapshot = backend('Infrastructure/Migrations/KidsfitDbContextModelSnapshot.cs');
  const migration = backend('Infrastructure/Migrations/20261112100000_OptionalContractPackageReference.cs');
  assert.match(entity, /public long\? ProductPackageId \{ get; set; \}/);
  assert.match(snapshot, /b\.Property<long\?>\("ProductPackageId"\)/);
  assert.match(migration, /migrationBuilder\.AlterColumn<long>/);
  assert.match(migration, /nullable: true/);
  assert.match(migration, /migrationBuilder\.DropForeignKey/);
  assert.match(migration, /migrationBuilder\.AddForeignKey/);
  assert.doesNotMatch(migration, /DropTable|DeleteData|TRUNCATE|UPDATE sales_contract_items/i);
});
