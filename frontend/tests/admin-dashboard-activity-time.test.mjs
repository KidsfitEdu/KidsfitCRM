import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const source=readFileSync(resolve(import.meta.dirname,'../src/screens/Admin/Dashboard/DashboardPage.tsx'),'utf8');
test('Admin activity timestamps are validated before formatting and bad values render fallback',()=>{
  assert.match(source,/const validActivityTime=\(value:unknown\)/);
  assert.match(source,/typeof value==='string'/);
  assert.match(source,/Number\.isFinite\(new Date\(value\)\.getTime\(\)\)/);
  assert.match(source,/if\(!validActivityTime\(value\)\)return '—';/);
  assert.match(source,/try\{return activityTimeFormatter\.format\(new Date\(value\)\);\}/);
  assert.match(source,/catch\{return '—';\}/);
});
test('Admin activity list and detail drawer both use safe formatter',()=>{
  assert.match(source,/dateTime=\{validActivityTime\(x\.createdAt\)\?x\.createdAt:undefined\}/);
  assert.match(source,/\{fmtTime\(x\.createdAt\)\}/);
  assert.match(source,/\{fmtTime\(selectedActivity\.createdAt\)\}/);
});
test('Safe timestamp validation recognizes invalid, empty and valid UTC values',()=>{
  const valid=(value)=>typeof value==='string' && value.trim().length>0 && Number.isFinite(new Date(value).getTime());
  for(const input of [null,undefined,'','not-a-date','2026-99-99T00:00:00Z',42])assert.equal(valid(input),false);
  assert.equal(valid('2026-11-19T01:20:00Z'),true);
});
