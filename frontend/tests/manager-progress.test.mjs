import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(import.meta.dirname,'../src/components/roles/ManagerWorklists.tsx'),'utf8');
test('manager progress uses scoped backend pagination and Sales filter',()=>{
  assert.match(source,/\/manager\/progress-schools\?/);
  assert.match(source,/owner_user_id/);
  assert.match(source,/Lọc nhân viên Sales\/CTV/);
  assert.match(source,/Tất cả Sales\/CTV/);
  assert.match(source,/customers\.data\?\.total/);
  assert.doesNotMatch(source,/api<ChannelSalesWorkspace>\('\/workspace'\)/);
  assert.doesNotMatch(source,/const progressRows =/);
});
test('manager progress filters reset and preserve existing action panel',()=>{
  assert.match(source,/setStaffFilter\('ALL'\)/);
  assert.match(source,/setPage\(1\)/);
  assert.match(source,/setWorkLog/);
  assert.match(source,/<ProgressTableRows rows=\{progressPage\}/);
});
