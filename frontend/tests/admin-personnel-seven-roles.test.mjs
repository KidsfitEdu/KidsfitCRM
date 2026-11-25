import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const root=resolve(import.meta.dirname,'..');
const read=path=>readFileSync(resolve(root,path),'utf8');
const ui=read('src/screens/Admin/Personnel/PersonnelPage.tsx');
const create=read('../backend/src/KidsfitCRM.Api/Features/Personnel/SalesPersonnelActions.cs');
const update=read('../backend/src/KidsfitCRM.Api/Features/Personnel/AdminPersonnelEndpoints.cs');
const management=read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesOperationsEndpoints.cs');

test('Seven canonical roles, ADMIN bootstrap-only; no eighth role is invented',()=>{
  const header=ui.slice(ui.indexOf('const roleNames:'),ui.indexOf('const statusName'));
  for(const role of ['ADMIN','DIRECTOR','ACCOUNTANT','SALES_MANAGER','CUSTOMER_SERVICE','CHECKEE','SALES'])
    assert.match(header,new RegExp('\\b'+role+'\\b'));
  assert.match(header,/const officialRoles = \['ADMIN','DIRECTOR','ACCOUNTANT','SALES_MANAGER','CUSTOMER_SERVICE','CHECKEE','SALES'\]/);
  assert.match(create,/if \(roleCode == "ADMIN"\)/);
  assert.match(management,/DIRECTOR/);
  assert.doesNotMatch(ui,/editableRoles/);
});
test('Only KIDSFIT provisions director and internal roles; CHECKEE vendor uses organization code',()=>{
  assert.match(ui,/org.code==='CHECKEE'\)return \['CHECKEE'\]/);
  assert.match(ui,/org.code==='KIDSFIT'\)return \['DIRECTOR','ACCOUNTANT','SALES_MANAGER','CUSTOMER_SERVICE','SALES'\]/);
  assert.match(ui,/org.organization_type==='PARTNER'\?\['SALES_MANAGER','SALES'\]/);
  assert.match(ui,/onChange=\{e=>setCreateForm\(v=>\(\{\.\.\.v,organization_id:e.target.value/);
  assert.match(ui,/allowedRoles\(createForm.organization_id\)/);
  assert.match(create,/targetOrganization.Code == "CHECKEE"/);
  assert.match(create,/targetOrganization.Code != "KIDSFIT"/);
  assert.match(create,/r.Code == "ADMIN"/);
  assert.match(create,/x.Status == "ACTIVE"/);
});
test('BGĐ editing retains DIRECTOR role and privileged role field is read-only',()=>{
  assert.match(ui,/role_code:p.membership_type/);
  assert.doesNotMatch(ui,/editableRoles.includes\(p.membership_type\)\?p.membership_type:'SALES'/);
  assert.match(ui,/isProfileOnlyRole\(edit.membership_type\)/);
  assert.match(ui,/<Input id="admin-edit-role" readOnly value=\{roleText\(editForm.role_code\)\}/);
  assert.match(ui,/editForm.role_code!==edit.membership_type/);
  assert.match(update,/if \(oldRole == "DIRECTOR"\)/);
  assert.match(update,/if \(code != "DIRECTOR" \|\| organization.Code != "KIDSFIT"\)/);
  assert.match(update,/else if \(code == "DIRECTOR"\)/);
  assert.match(update,/membership.UserId == actor/);
});
test('Account provisioning remains transactional, hashed and audited',()=>{
  assert.match(create,/BeginTransactionAsync\(ct\)/);
  assert.match(create,/hasher.HashPassword\(user, password\)/);
  assert.match(create,/db.UserRoles.Add\(/);
  assert.match(create,/db.OrganizationMemberships.Add\(/);
  assert.match(create,/Audit.Add\(db, actorId, "CREATE_CHANNEL_ACCOUNT"/);
  assert.match(create,/CommitAsync\(ct\)/);
  assert.match(update,/Audit.Add\(db, actor, "UPDATE_ADMIN_PERSONNEL"/);
  assert.match(ui,/appNotice.operation\(operationId,refreshed\?'success':'warning'/);
});
