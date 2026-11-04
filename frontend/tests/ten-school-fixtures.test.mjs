import assert from 'node:assert/strict';
import test from 'node:test';
import { trainingSchools } from '../src/lib/ten-school-fixtures.ts';
import { demoChannelSalesWorkspace } from '../src/lib/channel-sales.ts';
import { readSchoolDemo } from '../src/lib/school-demo.ts';

test('all seven role previews share the same ten main school keys', async () => {
  const directory = await readSchoolDemo('/schools');
  assert.equal(trainingSchools.length, 10);
  assert.equal(directory.total, 10);
  assert.equal(new Set(trainingSchools.map(s=>s.code)).size, 10);
  assert.deepEqual(
    demoChannelSalesWorkspace.data.map(x=>x.display_name),
    directory.data.map(x=>x.display_name),
  );
  assert.deepEqual(
    trainingSchools.map(x=>x.code),
    directory.data.map(x=>x.school_code),
  );
  assert.deepEqual(
    trainingSchools.map(x=>x.code),
    Array.from({length:10},(_,i)=>'SCH'+String(i+1).padStart(4,'0')),
  );
});
test('training fixtures do not leak source workbook contacts or label fake payments as genuine', async () => {
  const detail = await readSchoolDemo('/schools/1');
  assert.equal(detail.units.filter(x=>x.unit_type==='BRANCH').length,9);
  for(const customer of demoChannelSalesWorkspace.data){
    assert.equal(customer.email,null);
    assert.equal(customer.phone,null);
    assert.equal(customer.contact_name,null);
    assert.doesNotMatch(customer.display_name,/\(demo\)/i);
    assert.equal(customer.commission_accrued,0);
    assert.equal(customer.can_record_revenue,false);
    assert.equal(customer.can_manage_approach,false);
  }
  for(const school of trainingSchools) assert.equal(school.name.includes('(demo)'),false);
  assert.equal(demoChannelSalesWorkspace.metrics.contract_value,108000000);
  assert.equal(demoChannelSalesWorkspace.metrics.collected_revenue,18000000);
  assert.equal(demoChannelSalesWorkspace.metrics.commission_accrued,0);
});
