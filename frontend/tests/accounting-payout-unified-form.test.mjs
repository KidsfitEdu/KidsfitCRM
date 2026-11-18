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
  assert.ok(form.includes('{payoutCreateReady&&payoutDraftForm}'));
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
