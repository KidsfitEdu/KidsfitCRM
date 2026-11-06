import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('All contract detail roles use a single Vietnamese service plan formatter', () => {
  const shared = read('src/lib/contract-payment-plan.ts');
  assert.match(shared, /export const getServicePlanLabel/);
  assert.match(shared, /'SCHOOL_YEAR':?/);
  assert.match(shared, /Gói năm học \(9 tháng, tặng 3 tháng hè\)/);
  assert.match(shared, /'MONTHLY_9':?/);
  assert.match(shared, /Gói hàng tháng \(9 tháng\)/);
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
