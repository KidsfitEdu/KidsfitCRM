import assert from 'node:assert/strict';
import test from 'node:test';
import { ALLOCATION_SCHOOL_PAGE_SIZE, loadAllocationSchools } from '../src/lib/manager-allocation.ts';
import { ChannelRequestError } from '../src/lib/channel-operations.ts';

test('allocation loads every available school with supported 50-row API requests', async () => {
  const requested = [];
  const schools = Array.from({length: 123}, (_, i) => ({id:i+1}));
  const result = await loadAllocationSchools(async (page, size) => {
    requested.push([page, size]);
    return { data: schools.slice((page-1)*size,page*size), total: schools.length };
  });
  assert.equal(ALLOCATION_SCHOOL_PAGE_SIZE, 50);
  assert.deepEqual(requested, [[1,50],[2,50],[3,50]]);
  assert.deepEqual(result.data, schools);
  assert.equal(result.total, 123);
});

test('allocation treats an empty response as a legitimate empty directory', async () => {
  const result = await loadAllocationSchools(async () => ({ data: [], total: 0 }));
  assert.deepEqual(result, {data: [],total: 0});
});

test('allocation deduplicates schools moved between API pages', async () => {
  const result = await loadAllocationSchools(async page => page === 1
    ? {data:[{id:1},{id:2}],total:51}
    : {data:[{id:2},{id:3}],total:51});
  assert.deepEqual(result.data.map(row=>row.id), [1,2,3]);
});

test('allocation propagates API failures rather than claiming no schools exist', async () => {
  await assert.rejects(
    loadAllocationSchools(async page => {
      if (page === 2) throw new ChannelRequestError('Không có quyền', 403);
      return { data:[{id:1}], total: 60 };
    }),
    cause => cause instanceof ChannelRequestError && cause.status === 403,
  );
});

test('allocation rejects invalid response totals', async () => {
  await assert.rejects(
    loadAllocationSchools(async () => ({ data: [], total: -1 })),
    /không hợp lệ/,
  );
});
