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
  assert.match(receiptActions,/BoardCommissionPolicy\.ResolveAt/);
  assert.match(receiptActions,/if \(policy.Sales > 0m\)/);
  assert.match(receiptActions,/if \(policy.Manager > 0m && managerId.HasValue/);
  assert.match(receiptActions,/CommissionAccrual\.Create/);
  assert.match(receiptActions,/COMMISSION_MANAGER_REVIEW_REQUIRED/);
  assert.doesNotMatch(payoutActions,/Backfill|CreateMissingLedger|GenerateCommissionAutomatically/);
});

test('Accounting separates contracts and role-specific payout overview',()=>{
  assert.match(accounting,/label:'Hợp đồng'/);
  assert.match(accounting,/label:'Khoản thu nhà trường'/);
  assert.match(accounting,/Phiếu chi hoa hồng/);
  assert.match(accounting,/beneficiary_role:candidate!\.beneficiary_role/);
  assert.match(accounting,/role="tab"/);
  assert.match(accounting,/\/accounting\/payouts\?/);
});

test('Legacy backfill remains safeguarded on the server but has no Accounting UI entry point',()=>{
  // No legacy receipt backfill/reconciliation UI: explicitly retired by product decision.
  // Keep assertions covering the dormant server-side verification safeguards.
  const handler=read('../backend/src/KidsfitCRM.Api/Features/Commissions/Accruals/ReceiptCommissionBackfillActions.cs');
  const dto=read('../backend/src/KidsfitCRM.Api/Features/ChannelSalesContracts.cs');
  assert.match(handler,/PreviewReceiptCommissionBackfill/);
  assert.match(handler,/BackfillReceiptCommission/);
  assert.match(handler,/assessment.LedgerCount != 0/);
  assert.match(handler,/request.ManagerVerified/);
  assert.match(handler,/COMMISSION_MANAGER_REVIEW_REQUIRED/);
  assert.match(handler,/BACKFILL_RECEIPT_COMMISSION/);
  assert.match(dto,/ManagerVerified = false/);
  assert.doesNotMatch(accounting,/Đối soát hoa hồng khoản thu cũ|backfillManagerVerified|openBackfill|commission-backfill/);
});

test('Receipts and payout creation remain in dedicated tabs without reconciliation actions',()=>{
  assert.match(accounting,/label:'Khoản thu nhà trường'/);
  assert.match(accounting,/label:'Phiếu chi hoa hồng'/);
  assert.doesNotMatch(accounting,/Kiểm tra & đối soát|Lý do đối soát/);
  assert.match(accounting,/\/accounting\/payouts\?/);
  assert.match(accounting,/beneficiaries=beneficiaryEntries\.filter/);
  assert.match(accounting,/payoutSchools\.length===0/);
  const detail=read('src/screens/Accounting/Contracts/AccountingContractDetailContent.tsx');
  assert.doesNotMatch(detail,/Hoa hồng & phiếu chi|Nhà trường thanh toán/);
});

test('Payout actions distinguish draft, submission and adjustment without retired backfill wizard',()=>{
  assert.doesNotMatch(accounting,/Bước 1 · Kiểm tra khoản thu|Bước 2 · Kiểm tra người hưởng|Bước 3 · Lý do đối soát|backfillManagerVerified/);
  assert.doesNotMatch(accounting,/Thao tác này chỉ lập phiếu ở trạng thái Nháp/);
  assert.match(accounting,/Lưu nháp/);
  assert.match(accounting,/Gửi BGĐ duyệt/);
  assert.match(accounting,/Lý do điều chỉnh/);
  assert.match(accounting,/payoutPreview\.events\.map/);
  assert.match(accounting,/submitPayout\(pendingPayoutSubmit\.id\)/);
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
