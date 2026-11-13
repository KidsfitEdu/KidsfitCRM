import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('All contract detail roles use a single Vietnamese service plan formatter', () => {
  const shared = read('src/lib/contract-payment-plan.ts');
  assert.match(shared, /export const getServicePlanLabel/);
  assert.match(shared, /'SCHOOL_YEAR':?/);
  assert.match(shared, /Gói theo năm/);
  assert.match(shared, /'MONTHLY_9':?/);
  assert.match(shared, /Gói hàng tháng/);
  assert.match(shared, /Chưa xác định/);

  for (const path of [
    'src/screens/SalesManager/Contracts/ContractsPage.tsx',
    'src/screens/Checkee/Verification/VerificationPage.tsx',
    'src/screens/Accounting/Contracts/AccountingContractsPage.tsx',
  ]) {
    const source = read(path);
    assert.match(source, /getServicePlanLabel\(detail\.data\.service_plan\)/, path);
    assert.match(source, /from '@\/lib\/contract-payment-plan'/, path);
  }
});

test('Contract details list deployment units or explicitly say main school only', () => {
  const screens = [
    'src/screens/Accounting/Contracts/AccountingContractsPage.tsx',
    'src/screens/SalesManager/Contracts/ContractsPage.tsx',
  ];
  for (const screen of screens) {
    const source = read(screen);
    assert.match(source, /Trường điểm \/ Phân hiệu triển khai/, screen);
    assert.match(source, /detail\.school_units\.length > 0/, screen);
    assert.match(source, /detail\.school_units\.map\(unit=><li key=\{unit.id\}/, screen);
    assert.match(source, /Chỉ có trường chính, không có trường điểm \/ phân hiệu\./, screen);
    assert.doesNotMatch(source, /Chỉ trường chính \/ chưa khai báo/, screen);
  }
});
