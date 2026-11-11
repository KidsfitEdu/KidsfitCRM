import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('CRM initial bootstrap provisions seven roles and only three system accounts without demo scenarios', () => {
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

test('initial bootstrap persists permission rows before selecting them for role grants', () => {
  const initial = source('../backend/src/KidsfitCRM.Api/Infrastructure/InitialCrmSeeder.cs');
  const add = initial.indexOf('db.Permissions.AddRange(');
  const save = initial.indexOf('await db.SaveChangesAsync();', add);
  const lookup = initial.indexOf('var permissionByCode = await db.Permissions', add);
  assert.ok(add >= 0 && save > add && lookup > save, 'permissions must be persisted before role grant lookup');
});

test('initial bootstrap provisions exactly the two approved extra identities with scoped memberships', () => {
  const src=source('../backend/src/KidsfitCRM.Api/Infrastructure/InitialCrmSeeder.cs');
  for (const [code,email,role,secret] of [
    ['BOARD001','board@kidsfit.vn','DIRECTOR','Seed:BoardPassword'],
    ['CHECKEE001','checkee@kidsfit.vn','CHECKEE','Seed:CheckeePassword'],
  ]) {
    assert.ok(src.includes(`EnsureSystemAccount("${code}", "${email}"`));
    assert.ok(src.includes(`"${role}", "${secret}"`));
  }
  assert.match(src,/EnsureSystemMembership\(director, kidsfit, "DIRECTOR"\)/);
  assert.match(src,/EnsureSystemMembership\(checkee, checkeeOrganization, "CHECKEE"\)/);
  assert.match(src,/if \(!linkedRoles\.Contains\(roleCode\)\)/);
  assert.match(src,/membership\.MembershipType != roleCode/);
  assert.match(src,/user\.Password = hasher\.HashPassword\(user, secret\)/);
  assert.doesNotMatch(src,/user\.Password\s*=\s*secret;/);
});

test('BGĐ workflow policy V1 is created once as inactive DRAFT without overwriting existing versions', () => {
  const src=source('../backend/src/KidsfitCRM.Api/Infrastructure/InitialCrmSeeder.cs');
  assert.match(src,/!await db\.SchoolWorkflowPolicies\.AnyAsync\(x => x\.OrganizationId == kidsfit\.Id\)/);
  assert.match(src,/Version = 1, Status = "DRAFT"/);
  assert.match(src,/ManagerReviewHours = 24, AdminReviewHours = 48, InvitationHours = 24/);
  assert.match(src,/MaxExtensionDays = 7, MaxExtensionCount = 3, MaxTotalExtensionDays = 21/);
  assert.match(src,/CreatedByUserId = director\.Id/);
  assert.doesNotMatch(src,/Status = "ACTIVE"/);
});

test('Admin personnel form still excludes privileged roles from regular account creation', () => {
  const src=source('src/screens/Admin/Personnel/PersonnelPage.tsx');
  assert.match(src,/const editableRoles = \['SALES','SALES_MANAGER','ACCOUNTANT','CUSTOMER_SERVICE','CHECKEE'\]/);
  assert.doesNotMatch(src,/editableRoles = \[[^\]]*'DIRECTOR'/);
});
