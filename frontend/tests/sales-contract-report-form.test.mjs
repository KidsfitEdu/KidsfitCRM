import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {getServicePlanLabel,paymentCycleForPlan} from '../src/lib/contract-payment-plan.ts';

const screen=readFileSync(resolve(import.meta.dirname,'../src/components/crm/channel-sales-view.tsx'),'utf8');

test('plan labels are concise and underlying billing semantics remain unchanged',()=>{
  assert.equal(getServicePlanLabel('SCHOOL_YEAR'),'Gói theo năm');
  assert.equal(getServicePlanLabel('MONTHLY_9'),'Gói hàng tháng');
  assert.equal(paymentCycleForPlan('SCHOOL_YEAR'),'YEARLY');
  assert.equal(paymentCycleForPlan('MONTHLY_9'),'MONTHLY');
  assert.equal(getServicePlanLabel('UNKNOWN'),'Chưa xác định');
});

test('contract report uses common dialog with fixed manager review submission action',()=>{
  assert.match(screen,/return <AppDialog open onOpenChange=\{open=>\{if\(!open&&!saving\)onClose\(\);\}\}/);
  assert.match(screen,/form="sales-contract-report-form"/);
  assert.match(screen,/id="sales-contract-report-form"/);
  assert.match(screen,/Gửi Quản lý duyệt/);
  assert.match(screen,/Quản lý bán hàng xem xét, phê duyệt trước khi chuyển CHECKEE xác minh/);
  assert.match(screen,/getServicePlanLabel\(option\)/);
  assert.doesNotMatch(screen,/Gói năm học \(9 tháng, tặng 3 tháng hè\)/);
  assert.doesNotMatch(screen,/Gói hàng tháng \(9 tháng\)/);
});

test('contract submission still uses evidence, idempotency and existing amounts',()=>{
  assert.match(screen,/service_plan: plan/);
  assert.match(screen,/payment_cycle: paymentCycle/);
  assert.match(screen,/maintenance_fee: maintenance/);
  assert.match(screen,/setup_fee: setup/);
  assert.match(screen,/evidence_id: response\.data\.id/);
  assert.match(screen,/const multiplier = plan === 'MONTHLY_9' \? 9 : 1/);
});
