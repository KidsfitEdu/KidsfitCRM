import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const ui=p=>readFileSync(resolve(import.meta.dirname,'../src',p),'utf8');
const back=p=>readFileSync(resolve(import.meta.dirname,'../../backend/src/KidsfitCRM.Api',p),'utf8');
test('BGĐ menu removes disputes but historic URL redirects to Tổng quan',()=>{
 const nav=ui('config/navigation.ts'),routes=ui('config/routes.ts'),workspace=ui('screens/Board/BoardWorkspace.tsx');
 assert.doesNotMatch(nav,/\{ id: 'role-board-disputes', label:/);
 assert.match(routes,/view === 'role-board-disputes'/);
 assert.match(routes,/role-board-dashboard/);
 assert.doesNotMatch(workspace,/DisputesPage|disputes: DisputesPage/);
});
test('school operations no longer exposes school dispute UI, API or EF model',()=>{
 const shared=ui('components/crm/school-operations.tsx');
 const endpoints=back('Features/SchoolOperationsEndpoints.cs');
 const actions=back('Features/SchoolGovernanceActions.cs');
 const model=back('Infrastructure/SchoolOperationsModelConfiguration.cs');
 for(const source of [shared,endpoints,actions,model]) assert.doesNotMatch(source,/SchoolDispute|school-disputes|data\.disputes|dispute_status/);
 assert.doesNotMatch(back('Domain/SchoolOperationsEntities.cs'),/class SchoolDispute/);
 assert.match(endpoints,/school-extensions/);
});
test('migration removes only school dispute schema and retired permission',()=>{
 const migration=back('Infrastructure/Migrations/20261119160000_RemoveSchoolDisputes.cs');
 const snapshot=back('Infrastructure/Migrations/KidsfitDbContextModelSnapshot.cs');
 assert.match(migration,/DropTable\(name: "school_disputes"\)/);
 assert.match(migration,/channel_sales\.school\.dispute\.resolve/);
 assert.doesNotMatch(migration,/DropTable.*reconciliation/i);
 assert.doesNotMatch(snapshot,/SchoolDispute|school_disputes/);
 assert.match(back('Features/Checkee/Reconciliation/CheckeeReconciliationActions.cs'),/DISPUTED/);
});
