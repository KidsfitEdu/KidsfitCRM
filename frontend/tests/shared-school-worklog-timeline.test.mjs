import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const timeline=read('src/components/crm/schools/school-work-log-drawer.tsx');
const manager=read('src/components/roles/ManagerWorklists.tsx');
const sales=read('src/components/crm/channel-sales-view.tsx');
const backend=read('../backend/src/KidsfitCRM.Api/Features/CustomerWorkLogEndpoints.cs');

test('manager progress opens the school journal through real API',()=>{
  assert.match(manager,/onJournal=\{c=>setWorkLog\(\{customerId:c.id,schoolName:c.display_name\}\)\}/);
  assert.match(manager,/setWorkLog\(\{customerId:c.id,schoolName:c.display_name\}\)/);
  assert.doesNotMatch(manager,/Xem nhật ký làm việc với trường/);
  assert.match(manager,/<SchoolWorkLogDrawer key=\{workLog\?\.customerId \?\? "closed"\}/);
  assert.match(sales,/<SchoolWorkLogDrawer open=\{true\}/);
});

test('shared journal groups activities by server-ordered recorded days, and paginates 20 per page',()=>{
  assert.match(timeline,/const PAGE_SIZE = 20/);
  assert.match(timeline,/const date=dayOf\(log.created_at\)/);
  assert.match(timeline,/grouped\.map\(group=>/);
  assert.match(timeline,/aria-label=\{'Ngày '\+group.date\}/);
  assert.match(timeline,/total>PAGE_SIZE/);
  assert.match(timeline,/Trang \{page\}\/\{pages\}/);
  assert.match(timeline,/setPage\(x=>Math.min\(pages,x\+1\)\)/);
  assert.match(timeline,/setPage\(1\);setAssignmentPage\(1\)/);
});

test('journal prioritizes contact notes and supports readable long notes without new nested drawers',()=>{
  assert.match(timeline,/AppWorkNoteContent content=\{log.content\} compact/);
  assert.match(timeline,/line-clamp-4/);
  assert.match(timeline,/Xem thêm/);
  assert.match(timeline,/Thu gọn/);
  assert.match(timeline,/Ghi nhận bởi/);
  assert.match(timeline,/Chưa có nhật ký làm việc nào/);
  assert.doesNotMatch(timeline,/Tất cả kênh/);
  assert.doesNotMatch(timeline,/lần làm việc được ghi nhận/);
  assert.doesNotMatch(timeline,/Mỗi lượt thuộc nhân sự và thời hạn riêng/);
});

test('access right history is separate, collapsed, localized and independently paginated',()=>{
  assert.match(timeline,/Lịch sử quyền tiếp cận/);
  assert.match(timeline,/aria-expanded=\{rightsExpanded\}/);
  assert.match(timeline,/registrationNames/);
  assert.match(timeline,/CONVERTED:'Đã ký hợp đồng'/);
  assert.match(timeline,/ACTIVE:'Đang tiếp cận'/);
  assert.match(timeline,/assignment_total/);
  assert.match(timeline,/Trang \{assignmentPage\}\/\{rightsPages\}/);
  assert.match(backend,/assignmentPage = Math.Clamp\(assignmentPage, 1, 100_000\)/);
  assert.match(backend,/assignmentTotal = await assignmentQuery.CountAsync\(ct\)/);
  assert.match(backend,/Skip\(\(assignmentPage - 1\) \* pageSize\)\.Take\(pageSize\)/);
  assert.match(backend,/assignment_total = assignmentTotal/);
  assert.doesNotMatch(backend,/Take\(100\)/);
});

test('existing work log role and tenant checks stay server-controlled',()=>{
  assert.match(backend,/activeOrgIds.Contains\(r.OwnerOrganizationId\)/);
  assert.match(backend,/access.Organization \|\| r.OwnerUserId == access.UserId/);
  assert.match(backend,/query = query.Where\(a => a.ApproachRegistrationId.HasValue/);
  assert.match(backend,/orderb[y]? activity.CreatedAt descending, activity.Id descending/);
});
