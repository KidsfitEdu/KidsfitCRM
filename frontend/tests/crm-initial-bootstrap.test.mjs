import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('CRM initial bootstrap provisions the seven canonical roles and one administrator without demo scenarios', () => {
  const initial = source('../backend/src/KidsfitCRM.Api/Infrastructure/InitialCrmSeeder.cs');
  for (const role of ['ADMIN','DIRECTOR','ACCOUNTANT','SALES_MANAGER','CUSTOMER_SERVICE','CHECKEE','SALES']) {
    assert.match(initial, new RegExp('\\("'+role+'",'));
  }
  assert.match(initial, /db\.Users\.Add\(admin\)/);
  assert.match(initial, /await db\.Users\.AnyAsync\(\)/);
  assert.match(initial, /db\.UserRoles\.AnyAsync/);
  assert.match(initial, /db\.OrganizationMemberships\.AnyAsync/);
  assert.doesNotMatch(initial, /CrmScenarioSeeder|CrmReviewSeeder|DatabaseSeeder\.SeedAsync|EnsureUser\("SALES/);
  assert.doesNotMatch(initial, /Database\.EnsureDeleted|ExecuteDelete|TRUNCATE|DROP TABLE/i);
});

test('demo seeding is disabled in the runtime, and the local reset invokes only initial bootstrap', () => {
  const program=source('../backend/src/KidsfitCRM.Api/Program.cs');
  const reset=source('../backend/scripts/reset-demo-database.ps1');
  assert.match(program, /Demo seeding has been disabled/);
  assert.match(program, /InitialCrmSeeder\.SeedAsync/);
  assert.doesNotMatch(program, /DatabaseSeeder\.SeedAsync/);
  assert.match(reset, /--seed-initial/);
  assert.doesNotMatch(reset, /--seed-demo/);
  assert.match(reset, /Seed__AdminPassword/);
  assert.match(reset, /ConfirmDatabaseName/);
});

test('Admin personnel form exposes an accessible password visibility toggle', () => {
  const form=source('src/screens/Admin/Personnel/PersonnelPage.tsx');
  assert.match(form,/showCreatePassword,setShowCreatePassword/);
  assert.match(form,/type=\{showCreatePassword \? 'text' : 'password'\}/);
  assert.match(form,/aria-label=\{showCreatePassword \? 'Ẩn mật khẩu' : 'Hiện mật khẩu'\}/);
  assert.match(form,/autoComplete="new-password"/);
});
