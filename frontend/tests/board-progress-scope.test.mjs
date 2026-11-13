import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const read=(path)=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const board=read('src/screens/Board/BoardProgressPage.tsx');
const workspace=read('src/screens/Board/BoardWorkspace.tsx');
const navigation=read('src/config/navigation.ts');
const sections=read('src/config/role-pages.ts');
const manager=read('src/components/roles/ManagerWorklists.tsx');
const shared=read('src/components/crm/schools/school-progress-table.tsx');
const api=read('../backend/src/KidsfitCRM.Api/Features/ManagerProgressEndpoints.cs');
const journal=read('../backend/src/KidsfitCRM.Api/Features/CustomerWorkLogEndpoints.cs');

test('Board progress is accessible from Board navigation and same View routing',()=>{
  assert.match(navigation,/role-board-progress/);
  assert.match(navigation,/Theo dõi tiến độ/);
  assert.match(sections,/progress: \{label:"Theo dõi tiến độ"/);
  assert.match(workspace,/progress: BoardProgressPage/);
});
test('Board and managers share one progress table and one journal drawer',()=>{
  assert.match(manager,/<ProgressTableHeading\/>/);
  assert.match(manager,/<ProgressTableRows rows=\{progressPage\}/);
  assert.match(board,/<ProgressTableHeading board\/>/);
  assert.match(board,/<ProgressTableRows board rows=\{progress.data\?\.data\?\?\[\]\}/);
  assert.match(board,/<SchoolWorkLogDrawer/);
  assert.match(manager,/<SchoolWorkLogDrawer/);
  assert.match(shared,/Xem nhật ký/);
});
test('Board offers server-side organization, staff and status filters with pagination',()=>{
  assert.match(board,/\/board\/progress-schools\?/);
  assert.match(board,/params\.set\('organization_id',orgFilter\)/);
  assert.match(board,/params\.set\('owner_user_id',staffFilter\)/);
  assert.match(board,/params\.set\('search',search\.trim\(\)\)/);
  assert.match(board,/setPage\(1\)/);
  assert.match(board,/<AppPagination/);
  assert.match(board,/allowed&&!!token/);
  assert.match(board,/không có quyền giám sát tiến độ/);
});
test('API enforces different Board versus direct report scopes before pagination',()=>{
  assert.match(api,/MapGet\("\/board\/progress-schools", BoardList\)/);
  assert.match(api,/RequireAuthorization\(Permissions\.ChannelSalesAllScope\)/);
  assert.match(api,/m\.ManagerUserId == access\.UserId/);
  assert.match(api,/\? !access\.All \|\| !access\.Has\(Permissions\.ChannelSalesView\)/);
  assert.match(api,/organization_id/);
  assert.match(api,/members\.Any\(m => m\.UserId == p\.OwnerUserId/);
  assert.match(api,/OwnerOrganizationId/);
  assert.match(api,/organization_name = organizations\.GetValueOrDefault/);
  assert.match(journal,/managerOnly = !access\.All && access\.Has\(Permissions\.ChannelSalesTeamManage\)/);
  assert.match(journal,/m\.ManagerUserId == access\.UserId/);
});
