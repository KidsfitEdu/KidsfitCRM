import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const picker=read('src/components/common/forms/app-date-picker.tsx');
const tree=read('src/screens/Accounting/Contracts/AccountingContractTreeTable.tsx');
const api=read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');

test('Contract toolbar reuses the CRM calendar for date-only filters',()=>{
  assert.ok(page.includes('label="Từ ngày"')&&page.includes('label="Đến ngày"'));
  assert.ok(page.includes('ariaLabel="Bộ lọc cần xử lý"'));
  assert.doesNotMatch(page,/ariaLabel="Loại hợp đồng"|ariaLabel="Năm sử dụng"|ariaLabel="Lọc theo người phụ trách"|ariaLabel="Lọc nhóm hợp đồng Kế toán"/);
  assert.ok(page.includes('overflow-y-hidden'));
  assert.ok(picker.includes("import {Calendar} from '@/components/ui/calendar'"));
  assert.ok(picker.includes('captionLayout="dropdown"'));
  assert.ok(picker.includes("format(date,'yyyy-MM-dd')"));
  assert.doesNotMatch(picker,/Clock3|draftHour|draftMinute|type="month"/);
});

test('Contract dates validate and scope the server list before pagination',()=>{
  assert.ok(page.includes('serviceFrom>serviceTo'));
  assert.ok(page.includes("setDateRangeError('Từ ngày không được sau Đến ngày.')"));
  assert.ok(page.includes("params.set('service_from',appliedServiceFrom)"));
  assert.ok(page.includes("params.set('service_to',appliedServiceTo)"));
  assert.ok(api.includes('service_from.Value > service_to.Value'));
  assert.ok(api.includes('c.source_service_end_on.Value >= service_from.Value'));
  assert.ok(api.includes('c.source_service_start_on.Value <= service_to.Value'));
  assert.ok(api.includes('rows.Skip((pn - 1) * size).Take(size)'));
  assert.ok(tree.includes('p.end>=fromDate'));
  assert.ok(tree.includes('p.start<=toDate'));
  assert.ok(page.includes("setServiceFrom('');setServiceTo('')"));
});
