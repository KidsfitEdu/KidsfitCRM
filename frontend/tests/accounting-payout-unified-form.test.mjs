import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
const api=readFileSync(resolve(import.meta.dirname,'../../backend/src/KidsfitCRM.Api/Features/AccountingPayoutEndpoints.cs'),'utf8');
const start=page.indexOf('    <AppDialog open={payoutPickerOpen}');
const end=page.indexOf('    <AppDrawer open={payoutPreview!==null}',start);
const form=page.slice(start,end);
test('New payout uses one form without editable commission period or a next step',()=>{
  assert.doesNotMatch(form,/payoutPeriodLabel\(payoutCreatePeriod\)|Kỳ hoa hồng/);
  assert.doesNotMatch(form,/type="month"|Tiếp tục lập phiếu/);
  assert.ok(form.includes('Nhà trường *'));
  assert.ok(form.includes('Người hưởng hoa hồng *'));
  assert.ok(form.includes('form="accounting-payout-draft-form"'));
  assert.ok(form.includes('{payoutCreateReady&&!payoutDetailError&&<div'));
  assert.ok(form.includes('{payoutDraftForm}'));
  assert.ok(page.includes("setPayoutCreatePeriod('')"));
});
test('Eligible beneficiaries scoped by school and exact period',()=>{
  assert.ok(page.includes("contract_id:String(payoutSchool.id),page:'1',page_size:'100'"));
  assert.ok(api.includes('if (contract_id.HasValue) entries = entries.Where(x => x.ContractId == contract_id.Value);'));
  assert.ok(api.includes('if (contract_id.HasValue && contract_id.Value <= 0)'));
  assert.ok(page.includes('item.contract_id===payoutSchool.id&&item.amount>0'));
  assert.ok(page.includes('choosePayoutSchool'));
  assert.ok(page.includes('choosePayoutBeneficiary'));
  assert.ok(page.includes('setPayoutCreatePeriod(candidate.period)'));
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
  assert.ok(page.includes("payoutPickerOpen&&!editingPayout?payoutCreatePeriod"));
  assert.ok(page.includes("payoutPickerOpen&&!editingPayout?undefined:beneficiaries[0]"));
  assert.ok(page.includes("chosenPeriod!==payoutCreatePeriod"));
  assert.ok(page.includes("currentBeneficiary?.id!==candidate.beneficiary_user_id"));
  assert.ok(page.includes("currentBeneficiary?.role!==candidate.beneficiary_role"));
  assert.ok(page.includes("period:payoutCreatePeriod,contract_id:candidate!.contract_id"));
  assert.ok(page.includes("const candidate=chosenCandidate"));
  assert.ok(page.includes("eligibleForSelection.reduce((sum,entry)=>sum+entry.amount,0)<=0"));
  assert.doesNotMatch(page,/!centralPayoutIntent\|\|centralPayoutIntent.mode!=='CREATE'/);
});

test('Payout form remains empty until both contract and eligible beneficiary are selected',()=>{
  assert.ok(form.includes('!chosenCandidate&&!payoutSchoolLoading'));
  assert.ok(form.includes('Chọn nhà trường và người hưởng để hiển thị thông tin hoa hồng.'));
  assert.ok(form.includes('Đang tải tỷ lệ và tiền hoa hồng từ hợp đồng đã chọn'));
  assert.ok(form.includes('Đã tự điền thông tin hoa hồng theo hợp đồng và người hưởng'));
  assert.ok(form.includes('payoutDetailError&&chosenCandidate'));
  assert.ok(form.includes('Tải lại dữ liệu'));
  assert.ok(page.includes("setPayoutSchool(school);setPayoutPickerSearch(school.name)"));
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
  assert.ok(page.includes('editingPayout&&<div'));
  assert.ok(page.includes('% Hoa hồng *'));
  assert.ok(page.includes('Tiền hoa hồng (VNĐ) *'));
});

test('School search is one accessible combobox with remote paging and selection',()=>{
  assert.match(form,/role="combobox" aria-autocomplete="list"/);
  assert.match(form,/role="listbox"/);
  assert.match(form,/role="option"/);
  assert.match(form,/onKeyDown=\{event=>/);
  assert.match(form,/event\.key==='ArrowDown'/);
  assert.match(form,/event\.key==='Enter'/);
  assert.match(form,/choosePayoutSchool\(school\.id\)/);
  assert.match(form,/aria-label="Bỏ chọn nhà trường"/);
  assert.match(form,/setEligiblePage\(v=>v\+1\)/);
  assert.doesNotMatch(form,/accounting-payout-school" aria-label="Chọn nhà trường và hợp đồng"/);
  assert.doesNotMatch(form,/Nhà trường \/ Hợp đồng \*/);
  assert.doesNotMatch(form,/description="Chọn nhà trường/);
  assert.ok(page.includes('setPayoutSchool(school);setPayoutPickerSearch(school.name)'));
  assert.ok(page.includes("setPayoutSchool(null);setPayoutCandidateKey('')"));
});

test('Payout empty placeholder has icon and hides draft amounts until beneficiary selected',()=>{
  assert.match(form,/ClipboardCheck className="size-5 text-muted-foreground\/70"/);
  assert.match(form,/Chọn nhà trường và người hưởng để hiển thị thông tin hoa hồng\./);
  assert.ok(form.includes('{payoutCreateReady&&!payoutDetailError&&<div'));
  assert.match(form,/disabled=\{!payoutCreateReady\|\|saving\}/);
});

test('Selected school clear action is icon-only and draft does not show redundant notice',()=>{
  assert.match(form,/aria-label="Bỏ chọn nhà trường"/);
  assert.match(form,/title="Bỏ chọn nhà trường"/);
  assert.match(form,/<X className="size-4" aria-hidden="true"\/>/);
  assert.doesNotMatch(form,/>Xóa<\/button>/);
  assert.doesNotMatch(page,/Thao tác này chỉ lập phiếu ở trạng thái Nháp/);
  assert.doesNotMatch(page,/Giá trị chính thức sẽ được Backend kiểm tra/);
  assert.ok(page.includes("setPayoutPickerSearch('');setPayoutSchool(null);setPayoutCandidateKey('')"));
  assert.ok(page.includes("setPayoutDialogOpen(false)"));
});

test('Auto-fill completion does not invalidate save after loading intent clears',()=>{
  assert.ok(page.includes('setCentralPayoutIntent(null)'));
  assert.ok(page.includes('const candidate=chosenCandidate'));
  assert.ok(page.includes('!payoutPickerOpen||!payoutCreateReady||!candidate'));
  assert.ok(page.includes('candidate.contract_id!==payoutSchool.id'));
  assert.ok(page.includes('setPayoutCreatePeriod(candidate.period)'));
  assert.ok(page.includes('currentBeneficiary?.id!==candidate.beneficiary_user_id'));
  assert.ok(page.includes('currentBeneficiary?.role!==candidate.beneficiary_role'));
  assert.ok(page.includes('period:payoutCreatePeriod,contract_id:candidate!.contract_id'));
  assert.doesNotMatch(page,/Kỳ hoặc người hưởng đã thay đổi\. Vui lòng chọn lại khoản hoa hồng\./);
});

test('Selecting a payout candidate chooses its ledger period independent of document search date',()=>{
  assert.match(page,/setPayoutCreatePeriod\(candidate\.period\)/);
  assert.match(page,/candidate\.period!==payoutCreatePeriod/);
  assert.match(form,/payoutPeriodLabel\(item\.period\)/);
  assert.match(page,/new URLSearchParams\(\{page:String\(eligiblePage\),page_size:'20'\}\)/);
  assert.doesNotMatch(form,/type="month"/);
});
