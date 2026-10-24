import assert from 'node:assert/strict';
import test from 'node:test';
import { readSchoolDemo } from '../lib/school-demo.ts';

test('demo directory has fictional schools with readonly actions', async () => {
  const result = await readSchoolDemo('/schools?page=1');
  assert.equal(result.total, 3);
  assert.deepEqual(result.data.map(s => s.visible_status), ['AVAILABLE', 'APPROACHING', 'CONTRACTED']);
  for (const school of result.data) {
    assert.match(school.school_code, /^DEMO-SCH-/);
    assert.equal(school.can_register, false);
  }
});
test('demo search and empty results behave consistently', async () => {
  const result = await readSchoolDemo('/schools?search=anh%20duong');
  assert.equal(result.total, 1);
  assert.equal(result.data[0].id, 1);
  assert.equal((await readSchoolDemo('/schools?search=unknown-school')).total, 0);
  assert.equal((await readSchoolDemo('/schools?page=2')).data.length, 0);
});
test('demo details preserve branch grouping without real contacts', async () => {
  const detail = await readSchoolDemo('/schools/1');
  assert.equal(detail.units.length, 3);
  assert.equal(detail.units[0].unit_type, 'MAIN');
  assert.equal(detail.can_report_contract, false);
  for (const unit of detail.units) {
    assert.equal(unit.email, null);
    assert.equal(unit.contact_phone, null);
    assert.equal(unit.school_phone, null);
  }
});
test('demo contract is readonly and does not expose verification actions', async () => {
  const detail = await readSchoolDemo('/schools/3');
  assert.equal(detail.contracts.length, 1);
  assert.equal(detail.contracts[0].can_review, false);
  assert.equal(detail.contracts[0].can_grant, false);
  assert.ok(detail.contracts[0].verified_at);
});
test('demo does not implement upload or unknown customer endpoints', async () => {
  await assert.rejects(() => readSchoolDemo('/schools/import/commit'));
  await assert.rejects(() => readSchoolDemo('/schools/999'));
});
