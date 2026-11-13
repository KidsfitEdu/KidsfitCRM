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
  assert.match(payoutActions, /if \(payout\.Status != "PENDING_APPROVAL"\)/);
  assert.match(payoutActions, /SubmitPayout\(/);
  assert.match(payoutActions, /ReturnPayout\(/);
  assert.match(payoutActions, /RequireIndependentPayoutApprover/);
  assert.match(payoutActions, /if \(payout\.Status != "APPROVED"\)/);
  assert.match(payoutActions, /request\.Amount\.Value != payout\.NetAmount/);
  assert.match(payoutActions, /proof\.Kind != "PAYOUT"/);
  assert.match(payoutActions, /AddPayoutEvent\(payout, actorId, "APPROVED"/);
  assert.match(payoutActions, /AddPayoutEvent\(payout, actorId, "PAID"/);
});

test('Accounting can enable payout from unassigned positive commission independently of CHECKEE', () => {
  assert.match(accounting, /!entry\.assigned_to_payout/);
  assert.match(accounting, /eligiblePeriods=\[\.\.\.eligibleByPeriod\.entries\(\)\]/);
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

test('Accounting separates contracts and role-specific payout overview',()=>{
  assert.match(accounting,/Hợp đồng & khoản thu/);
  assert.match(accounting,/Phiếu chi hoa hồng/);
  assert.match(accounting,/beneficiary_role:currentBeneficiary\?\.role/);
  assert.match(accounting,/role="tab"/);
  assert.match(accounting,/financeOverview\?\.payouts/);
});

test('Legacy receipt requires explicit verified backfill and never silently reassigns manager share',()=>{
  const handler=read('../backend/src/KidsfitCRM.Api/Features/ReceiptCommissionBackfillActions.cs');
  const dto=read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesContracts.cs');
  assert.match(handler,/PreviewReceiptCommissionBackfill/);
  assert.match(handler,/BackfillReceiptCommission/);
  assert.match(handler,/assessment.LedgerCount != 0/);
  assert.match(handler,/request.ManagerVerified/);
  assert.match(handler,/COMMISSION_MANAGER_REVIEW_REQUIRED/);
  assert.match(handler,/BACKFILL_RECEIPT_COMMISSION/);
  assert.match(dto,/ManagerVerified = false/);
  assert.match(accounting,/Đối soát hoa hồng khoản thu cũ/);
  assert.match(accounting,/manager_verified:backfillManagerVerified/);
  assert.match(accounting,/!detail.ledger.some\(entry=>entry.revenue_receipt_id===receipt.id\)/);
});

test('Commission detail prioritizes actionable reconciliation and separate role summaries',()=>{
  assert.match(accounting,/aria-labelledby="contract-commission-heading"/);
  assert.match(accounting,/Cần đối soát khoản thu/);
  assert.match(accounting,/pendingBackfillReceipts\.map\(receipt/);
  assert.match(accounting,/Kiểm tra & đối soát/);
  assert.match(accounting,/Hoa hồng Sales/);
  assert.match(accounting,/Hoa hồng Quản lý/);
  assert.match(accounting,/Chưa đưa vào phiếu/);
  assert.match(accounting,/Lịch sử phiếu chi/);
  assert.match(accounting,/beneficiaries=beneficiaryEntries\.filter/);
  assert.match(accounting,/eligiblePeriods\.length>0/);
});

test('Backfill and payout dialogs show explicit reviewed amounts and never claim money was sent',()=>{
  assert.match(accounting,/Bước 1 · Kiểm tra khoản thu/);
  assert.match(accounting,/Bước 2 · Kiểm tra người hưởng/);
  assert.match(accounting,/Bước 3 · Lý do đối soát/);
  assert.match(accounting,/backfillManagerVerified/);
  assert.match(accounting,/Thao tác này chỉ lập phiếu ở trạng thái Nháp/);
  assert.match(accounting,/Lưu nháp/);
  assert.match(accounting,/Gửi phiếu .* đến BGĐ phê duyệt/);
  assert.match(accounting,/Lý do điều chỉnh/);
});

test('One shared payout transitions through BGĐ approval with required adjustment rationale',()=>{
  const actions=read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesFinanceActions.cs');
  const endpoints=read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesOperationsEndpoints.cs');
  const model=read('../backend/src/KidsfitCRM.Api/Domain/ChannelSalesEntities.cs');
  assert.match(endpoints,/\/payouts\/\{id:long\}\/draft/);
  assert.match(endpoints,/\/payouts\/\{id:long\}\/submit/);
  assert.match(endpoints,/\/payouts\/\{id:long\}\/return/);
  assert.match(actions,/payout\.Status = "PENDING_APPROVAL"/);
  assert.match(actions,/payout\.Status = "CHANGES_REQUESTED"/);
  assert.match(actions,/payout\.Status = "APPROVED"/);
  assert.match(actions,/payout\.Status = "PAID"/);
  assert.match(actions,/adjustment_reason/);
  assert.match(model,/SuggestedRatePercent/);
  assert.match(model,/RequestedAmount/);
});
