import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const load=p=>readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const manager=load('src/components/roles/ManagerWorklists.tsx');
const detail=load('src/components/crm/schools/manager-detail-sections.tsx');
const team=load('src/screens/SalesManager/Team/TeamPage.tsx');
test('manager detail screens reuse AppDrawer and show authorized existing fields',()=>{
assert.match(manager,/<AllocationDetail item=\{selection.item\}/);
assert.match(manager,/<ExtensionDetail item=\{selection.item\}/);
assert.match(detail,/Tham chiếu bằng chứng/);
assert.match(detail,/original_protected_until/);
assert.match(detail,/is_overdue/);
assert.match(detail,/is_expired/);
});
test('team detail preserves handover permissions and accurate capacity',()=>{
assert.match(team,/<progress aria-label="Mức sử dụng hạn mức tiếp cận"/);
assert.match(team,/selected.school_approach_limit-selected.active_schools/);
assert.match(team,/connected&&canHandover&&selected.status==='ACTIVE'/);
assert.match(team,/<SalesHandoverDrawer/);
});
