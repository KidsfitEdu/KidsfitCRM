import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
const api=readFileSync(resolve(import.meta.dirname,'../../backend/src/KidsfitCRM.Api/Features/AccountingPayoutEndpoints.cs'),'utf8');
const start=page.indexOf('    <AppDialog open={payoutPickerOpen}');
const end=page.indexOf('    <AppDialog open={payoutPreview!==null}',start);
const form=page.slice(start,end);
test('New payout uses one form without editable commission period or a next step',()=>{
  assert.ok(form.includes('payoutPeriodLabel(payoutCreatePeriod)'));
  assert.doesNotMatch(form,/type="month"|Tiếp tục lập phiếu/);
  assert.ok(form.includes('Nhà trường / Hợp đồng *'));
  assert.ok(form.includes('Người hưởng hoa hồng *'));
  assert.ok(form.includes('form="accounting-payout-draft-form"'));
  assert.ok(form.includes('{payoutCreateReady&&!payoutDetailError&&<div'));
  assert.ok(form.includes('{payoutDraftForm}'));
  assert.ok(page.includes('setPayoutCreatePeriod(financePeriod)'));
});
test('Eligible beneficiaries scoped by school and exact period',()=>{
  assert.ok(page.includes("contract_id:String(payoutSchool.id),page:'1',page_size:'100'"));
  assert.ok(api.includes('if (contract_id.HasValue) entries = entries.Where(x => x.ContractId == contract_id.Value);'));
  assert.ok(api.includes('if (contract_id.HasValue && contract_id.Value <= 0)'));
  assert.ok(page.includes('item.contract_id===payoutSchool.id&&item.period===payoutCreatePeriod'));
  assert.ok(page.includes('choosePayoutSchool'));
  assert.ok(page.includes('choosePayoutBeneficiary'));
  assert.ok(page.includes('candidate.period!==payoutCreatePeriod'));
  assert.ok(form.includes('disabled={!payoutCreateReady||saving}'));
});
test('Existing approved payout workflow and edit dialog remain distinct',()=>{
  assert.ok(page.includes("'/payouts',{method:'POST'"));
  assert.ok(page.includes("method:'PATCH'"));
  assert.ok(page.includes('payoutKey.current??=crypto.randomUUID()'));
  assert.ok(page.includes("if(intent.mode!=='CREATE')setPayoutPickerOpen(false)"));
  assert.ok(page.includes('setEditingPayout(payout)'));
  assert.ok(api.includes('Permissions.ChannelSalesPayoutCreate'));
});

test('Creating a payout pins the selected period and beneficiary without fallback',()=>{
  assert.ok(page.includes("centralPayoutIntent?.mode==='CREATE'?payoutCreatePeriod"));
  assert.ok(page.includes("centralPayoutIntent?.mode==='CREATE'?undefined:beneficiaries[0]"));
  assert.ok(page.includes("chosenPeriod!==payoutCreatePeriod"));
  assert.ok(page.includes("currentBeneficiary?.id!==centralPayoutIntent.beneficiaryUserId"));
  assert.ok(page.includes("currentBeneficiary?.role!==centralPayoutIntent.role"));
  assert.ok(page.includes("period:chosenPeriod,contract_id:detail.data.id"));
});

test('Payout form remains empty until both contract and eligible beneficiary are selected',()=>{
  assert.ok(form.includes('!chosenCandidate&&!payoutSchoolLoading&&!eligibleLoading'));
  assert.ok(form.includes('Chọn nhà trường và người hưởng để hệ thống tự điền'));
  assert.ok(form.includes('Đang tải tỷ lệ và tiền hoa hồng từ hợp đồng đã chọn'));
  assert.ok(form.includes('Đã tự điền thông tin hoa hồng theo hợp đồng và người hưởng'));
  assert.ok(form.includes('payoutDetailError&&chosenCandidate'));
  assert.ok(form.includes('Tải lại dữ liệu'));
  assert.ok(page.includes("setPayoutSchool(school);setPayoutCandidateKey('');setPayoutDetailError('')"));
  assert.ok(page.includes("setPayoutRate(String(base>0?Number((amount/base*100).toFixed(4)):0))"));
  assert.ok(page.includes("setPayoutRequestedAmount(String(amount))"));
  assert.ok(page.includes("setPayoutWithholding('0')"));
  assert.ok(form.includes('disabled={!payoutCreateReady||saving}'));
});

test('Payout editing preserves manual adjustments, withholding and audit rationale',()=>{
  assert.ok(page.includes('setPayoutRequestedAmount(String(Math.round(base*Number(rate)/100)))'));
  assert.ok(page.includes('setPayoutAdjustmentReason(event.target.value)'));
  assert.ok(page.includes('setPayoutWithholding(value)'));
  assert.ok(page.includes('parseMoneyInput(payoutRequestedAmount)-parseMoneyInput(payoutWithholding)'));
  assert.ok(page.includes('withholding_reason:withholding>0?payoutWithholdingReason.trim():null'));
  assert.ok(page.includes('adjustment_reason:payoutAdjustmentReason.trim()||null'));
  assert.ok(form.includes('editingPayout&&<div'));
  assert.ok(form.includes('% Hoa hồng *'));
  assert.ok(form.includes('Tiền hoa hồng (VNĐ) *'));
});
