import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');
const payoutActions = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesFinanceActions.cs');
const receiptActions = read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesActions.cs');
const detailApi = read('../backend/src/KidsfitCRM.Api/Features/AccountingContractEndpoints.cs');
const accounting = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');

test('Payout creation requires accrued ledger entries, period and beneficiary but not CHECKEE reconciliation', () => {
  assert.match(payoutActions, /RequirePermission\(actorId, Permissions\.ChannelSalesPayoutCreate/);
  assert.match(payoutActions, /x\.BeneficiaryOrganizationId == request\.OrganizationId/);
  assert.match(payoutActions, /x\.BeneficiaryUserId == request\.BeneficiaryUserId && x\.BeneficiaryRole == beneficiaryRole && x\.Period == period/);
  assert.match(payoutActions, /!db\.PayoutItems\.Any\(item => item\.CommissionLedgerEntryId == x\.Id\)/);
  assert.match(payoutActions, /if \(gross <= 0\)/);
  assert.doesNotMatch(payoutActions, /db\.ReconciliationCases/);
  assert.doesNotMatch(payoutActions, /EnsurePayoutReconciled/);
});

test('Payout approval and completion preserve RBAC, status, amounts and evidence validation', () => {
  assert.match(payoutActions, /RequirePermission\(actorId, Permissions\.ChannelSalesPayoutApprove/);
  assert.match(payoutActions, /RequirePermission\(actorId, Permissions\.ChannelSalesPayoutComplete/);
  assert.match(payoutActions, /if \(payout\.Status != "DRAFT"\)/);
  assert.match(payoutActions, /if \(payout\.Status != "APPROVED"\)/);
  assert.match(payoutActions, /request\.Amount\.Value != payout\.NetAmount/);
  assert.match(payoutActions, /proof\.Kind != "PAYOUT"/);
  assert.match(payoutActions, /AddPayoutEvent\(payout, actorId, "APPROVED"/);
  assert.match(payoutActions, /AddPayoutEvent\(payout, actorId, "PAID"/);
});

test('Accounting can enable payout from unassigned positive commission independently of CHECKEE', () => {
  assert.match(accounting, /!entry\.assigned_to_payout/);
  assert.match(accounting, /eligiblePeriods = \[\.\.\.eligibleByPeriod\.entries\(\)\]/);
  assert.doesNotMatch(accounting, /entry\.reconciled/);
  assert.doesNotMatch(accounting, /đối soát CHECKEE đã xác nhận/);
  assert.doesNotMatch(detailApi, /reconciled = db\.ReconciliationCases/);
  assert.match(detailApi, /assigned_to_payout = db\.PayoutItems\.Any/);
});

test('Receipt accrual uses board split on collected cash and does not automatically backfill old receipts', () => {
  assert.match(receiptActions,/BoardCommissionPolicyEndpoints.ResolveAt/);
  assert.match(receiptActions,/if \(policy.Sales > 0m\)/);
  assert.match(receiptActions,/if \(policy.Manager > 0m && managerId.HasValue/);
  assert.match(receiptActions,/NewCommissionAccrual/);
  assert.match(receiptActions,/COMMISSION_MANAGER_REVIEW_REQUIRED/);
  assert.doesNotMatch(payoutActions,/Backfill|CreateMissingLedger|GenerateCommissionAutomatically/);
});
