import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');
const page = read('src/screens/Board/BoardPoliciesPage.tsx');
const panel = read('src/screens/Board/BoardCommissionPoliciesPanel.tsx');
const endpoints = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesOperationsEndpoints.cs');
const actions = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesFinanceActions.cs');
const initialSeed = read('../backend/src/KidsfitCRM.Api/Infrastructure/InitialCrmSeeder.cs');
const receipts = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesActions.cs');

test('BGĐ policy page separates Sales commission from operational policies', () => {
  assert.match(page, /policyTab.*commission/);
  assert.match(page, /Hoa hồng Sales/);
  assert.match(page, /Chính sách vận hành/);
  assert.match(page, /<BoardCommissionPoliciesPanel/);
  assert.match(page, /<PolicyEditorDialog/);
});

test('Commission policies can be read and submitted as drafts, without automatic payout', () => {
  assert.match(panel, /channelRequest<FinanceWorkspace>\(apiBase, token, '\/finance'\)/);
  assert.match(panel, /channelRequest\(apiBase, token, '\/commission-policies'/);
  assert.match(panel, /effective_from: draft\.effective_from/);
  assert.match(panel, /personnel_type: draft\.personnel_type \|\| null/);
  assert.match(panel, /Lưu bản nháp/);
  assert.match(panel, /chưa tự động/i);
  assert.match(actions, /Status = "DRAFT"/);
  assert.match(receipts, /x\.Status == "ACTIVE"/);
  assert.doesNotMatch(panel, /\/commission-policies\/.*\/activate/);
});

test('BGĐ receives policy management permission without giving payout permissions', () => {
  assert.match(initialSeed, /rolePermissions\["DIRECTOR"\].*Permissions\.ChannelSalesPolicyManage/);
  assert.match(initialSeed, /kidsfit\.CommissionRateCeiling == 0/);
  assert.match(initialSeed, /kidsfit\.CommissionRateCeiling = 30m/);
  assert.match(endpoints, /group\.MapPost\("\/commission-policies"/);
  assert.match(endpoints, /\.RequireAuthorization\(Permissions\.ChannelSalesPolicyManage\)/);
  const role = initialSeed.match(/rolePermissions\["DIRECTOR"\] = \[\.\.\.rolePermissions\["DIRECTOR"\][^;]+;/)?.[0] ?? '';
  assert.doesNotMatch(role, /ChannelSalesPayoutCreate|ChannelSalesPayoutComplete/);
});

test('Cancellation is audited and cannot cancel an active policy', () => {
  assert.match(endpoints, /\/commission-policies\/\{id:long\}\/cancel-draft/);
  assert.match(actions, /if \(policy\.Status != "DRAFT"\)/);
  assert.match(actions, /"CANCEL_COMMISSION_POLICY_DRAFT"/);
  assert.match(actions, /policy\.Status = "CANCELLED"/);
  assert.doesNotMatch(actions, /Remove\(policy\)|ExecuteDelete/);
  assert.match(panel, /Hủy bản nháp/);
});
