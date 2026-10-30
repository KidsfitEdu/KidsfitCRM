import assert from 'node:assert/strict';
import test from 'node:test';
import { composeSchoolPage, schoolPageWindow, SCHOOL_ROWS_PER_PAGE } from '../src/lib/school-page-window.ts';

test('10-row UI pages select the correct half of the server page', () => {
  assert.deepEqual(schoolPageWindow(1, 10), { firstApiPage: 1, lastApiPage: 1, offsetWithinFirstPage: 0 });
  assert.deepEqual(schoolPageWindow(2, 10), { firstApiPage: 1, lastApiPage: 1, offsetWithinFirstPage: 10 });
  assert.deepEqual(schoolPageWindow(3, 10), { firstApiPage: 2, lastApiPage: 2, offsetWithinFirstPage: 0 });
  const rows = Array.from({length: 20}, (_, i) => ({id:i+1}));
  assert.deepEqual(composeSchoolPage([{data:rows,total:37}], 10, 10).data.map(x=>x.id), [11,12,13,14,15,16,17,18,19,20]);
});

test('20/50-row UI pages map to the existing 20-row API without changing server contract', () => {
  assert.deepEqual(schoolPageWindow(2, 20), {firstApiPage:2,lastApiPage:2,offsetWithinFirstPage:0});
  assert.deepEqual(schoolPageWindow(1, 50), {firstApiPage:1,lastApiPage:3,offsetWithinFirstPage:0});
  assert.deepEqual(schoolPageWindow(2, 50), {firstApiPage:3,lastApiPage:5,offsetWithinFirstPage:10});
  const responses = [0,1,2].map(k=>({data:Array.from({length:20},(_,i)=>k*20+i+1),total:61}));
  assert.deepEqual(composeSchoolPage(responses, 10, 50), {data:Array.from({length:50},(_,i)=>i+11),total:61});
  assert.deepEqual(SCHOOL_ROWS_PER_PAGE, [10,20,50]);
});

test('pagination rejects unsafe inputs instead of requesting unintended server pages', () => {
  for(const [page,size] of [[0,20],[-1,10],[1,0],[1,-10],[Infinity,20],[2,1e20]]) {
    assert.throws(()=>schoolPageWindow(page,size), RangeError);
  }
});
