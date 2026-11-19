import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const load=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const picker=load('src/components/crm/schools/allocation-school-picker.tsx');
const manager=load('src/components/roles/ManagerWorklists.tsx');
const form=load('src/components/crm/schools/school-action-form.tsx');
const api=load('../backend/src/KidsfitCRM.Api/Features/SchoolEndpoints.cs');
const actions=load('../backend/src/KidsfitCRM.Api/Features/SchoolAllocationActions.cs');
const invite=manager.slice(manager.indexOf('const invite ='),manager.indexOf('const records = operations.data'));

test('Allocation form opens without a school query or loading gate',()=>{
  assert.doesNotMatch(manager,/loadAllocationSchools|availableSchools = useQuery/);
  assert.doesNotMatch(invite,/operations.isPending \|\||availableSchools.isPending|appNotice.info\('Đang tải dữ liệu'/);
  assert.match(invite,/setAction\(\{/);
  assert.match(invite,/allocationSchoolPicker: \{apiBase,token/);
  assert.match(form,/AllocationSchoolPicker/);
});
test('Picker fetches five authorized AVAILABLE schools only after input opens',()=>{
  assert.match(picker,/const PAGE_SIZE=5/);
  assert.match(picker,/enabled:opened&&!!apiBase&&!!token/);
  assert.match(picker,/pageSize:String\(PAGE_SIZE\),status:'AVAILABLE'/);
  assert.match(picker,/if\(term\)params.set\('search',term\)/);
  assert.match(api,/selectedPageSize is not \(5 or 10 or 20 or 50\)/);
});
test('Picker debounces server search, caches pages and supports retry and accessible paging',()=>{
  assert.match(picker,/setTimeout\(\(\)=>\{setTerm\(typed.trim\(\)\);setPage\(1\);\},300\)/);
  assert.match(picker,/queryKey:\[\.\.\.channelQueryKeys\.all,'manager-allocation-school-search',apiBase,token,term,page\]/);
  assert.match(picker,/staleTime:30_000/);
  assert.match(picker,/Trang \{page\}\/\{totalPages\}/);
  assert.match(picker,/query.refetch\(\)/);
  assert.match(picker,/role="combobox"/);
  assert.match(picker,/role="listbox"/);
  assert.match(picker,/role="option"/);
  assert.match(picker,/<PopoverContent/);
  assert.match(picker,/initialFocus=\{false\} finalFocus=\{false\}/);
  assert.match(picker,/event.key==='ArrowDown'/);
  assert.match(picker,/event.key==='ArrowUp'/);
  assert.match(picker,/event.key==='Enter'/);
  assert.match(picker,/event.key==='Escape'/);
});
test('School search renders one custom clear control without a native search cancel button',()=>{
  assert.match(picker,/role="combobox" aria-autocomplete="list" type="text" inputMode="search"/);
  assert.doesNotMatch(picker,/type="search"/);
  assert.match(picker,/aria-label="Xóa từ khóa tìm trường"/);
  assert.match(picker,/onClick=\{\(\)=>search\(''\)\}/);
  assert.equal((picker.match(/aria-label="Xóa từ khóa tìm trường"/g)??[]).length,1);
});
test('Previously selected school ID remains in form, including reallocation',()=>{
  assert.match(picker,/onChange\(option.value\)/);
  assert.match(invite,/value: suggestedSchoolId\?String\(suggestedSchoolId\):undefined/);
  assert.match(manager,/releasedSchool\.school_name/);
});
test('Backend remains authority for capacity, active protection and pending invitation',()=>{
  assert.match(actions,/CheckSchoolCapacity\(request.AssigneeUserId, organizationId, ct\)/);
  assert.match(actions,/EnsureSchoolAvailable\(school.CustomerId, now, ct\)/);
  assert.match(actions,/db.SchoolInvitations.AnyAsync/);
});
