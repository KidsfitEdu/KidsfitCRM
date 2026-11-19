import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const picker=read('src/components/common/forms/app-date-picker.tsx');
const tree=read('src/screens/Accounting/Contracts/AccountingContractTreeTable.tsx');
const api=read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');

test('Contract toolbar reuses compact shared month picker',()=>{
  assert.match(page,/AppMonthPicker label="Tháng sử dụng hợp đồng"/);
  assert.match(page,/value=\{contractServiceMonth\} onChange=\{setContractServiceMonth\}/);
  assert.ok(page.includes('ariaLabel="Bộ lọc cần xử lý"'));
  assert.doesNotMatch(page,/<AppDatePicker label="Từ ngày"|<AppDatePicker label="Đến ngày"/);
  assert.ok(page.includes('overflow-y-hidden'));
});

test('Contract month covers complete business calendar and scopes list before pagination',()=>{
  assert.match(page,/const firstDay=contractServiceMonth\?/);
  assert.match(page,/new Date\(Date.UTC\(year,month,0\)\)\.getUTCDate\(\)/);
  assert.match(page,/setAppliedServiceFrom\(firstDay\)/);
  assert.match(page,/setAppliedServiceTo\(lastDay\)/);
  assert.ok(page.includes("params.set('service_from',appliedServiceFrom)"));
  assert.ok(page.includes("params.set('service_to',appliedServiceTo)"));
  assert.ok(api.includes('service_from.Value > service_to.Value'));
  assert.ok(api.includes('c.source_service_end_on.Value >= service_from.Value'));
  assert.ok(api.includes('c.source_service_start_on.Value <= service_to.Value'));
  assert.ok(api.includes('rows.Skip((pn - 1) * size).Take(size)'));
  assert.ok(tree.includes('p.end>=fromDate'));
  assert.ok(tree.includes('p.start<=toDate'));
  assert.match(page,/setContractServiceMonth\(''\)/);
});
test('Leap year and cross-year month boundaries have correct inclusive end days',()=>{
  const end=(period)=>{
    const [year,month]=period.split('-').map(Number);
    return `${period}-${String(new Date(Date.UTC(year,month,0)).getUTCDate()).padStart(2,'0')}`;
  };
  assert.equal(end('2024-02'),'2024-02-29');
  assert.equal(end('2026-02'),'2026-02-28');
  assert.equal(end('2026-12'),'2026-12-31');
});
