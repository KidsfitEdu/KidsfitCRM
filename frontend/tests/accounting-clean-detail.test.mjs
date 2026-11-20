import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const read=p=>readFileSync(resolve(import.meta.dirname,'..',p),'utf8');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const detail=read('src/screens/Accounting/Contracts/AccountingContractDetailContent.tsx');
const renewal=read('src/screens/Accounting/Contracts/AccountingRenewalInline.tsx');

test('Contract detail uses branded cards without duplicate payment and payout sections',()=>{
  assert.ok(page.includes('<AppDrawer compactHeader'));
  assert.ok(page.includes('<AccountingContractDetailContent'));
  for(const label of ['Thông tin hợp đồng','Thông tin nhà trường','Sales phụ trách & xử lý hồ sơ'])
    assert.ok(detail.includes(label),label);
  for(const label of ['Lịch thanh toán theo hợp đồng','Nhà trường thanh toán','Hoa hồng & phiếu chi'])
    assert.doesNotMatch(detail,new RegExp(label),label);
  assert.doesNotMatch(page,/paymentScheduleLabel|orderedSchedules|showAllSchedules|payoutHistoryYear|receiptHistoryYear/);
});

test('Contract details use the selected original or renewal record',()=>{
  for(const token of ['renewal?.contract_code','renewal?.signed_on','renewal?.service_start_on',
    'renewal?.service_end_on','renewal?.total_value','renewal?.payment_cycle','Hợp đồng lần đầu','Tái ký lần '])
    assert.ok(detail.includes(token),token);
  assert.ok(detail.includes('channelMoney(value)'));
  assert.ok(detail.includes('getServicePlanLabel(detail.data.service_plan)'));
  assert.ok(detail.includes('focusRenewalId={selectedPeriodId}'));
  assert.ok(detail.includes('Trường điểm / Phân hiệu ({detail.school_units.length})'));
  assert.ok(detail.includes('detail.school_units.map(unit=>'));
});

test('Receipts and payouts remain in their own tabs without manual receipt backfill',()=>{
  for(const token of ["/accounting/receipts?","receiptRows.map(receipt=>",
    "label:'Khoản thu nhà trường'","label:'Phiếu chi hoa hồng'",
    "visiblePayouts.map(p=>",'payoutPreview.can_approve','detail.ledger','<AppDrawer open={receiptPreview!==null}']) assert.ok(page.includes(token),token);
  assert.ok(page.includes('payoutStatusLabel(p.status)'));
  assert.doesNotMatch(page,/commission-backfill|openBackfill|confirmBackfill|backfillPreview/);
});

test('Currency inputs and evidence preview retain their behavior',()=>{
  const input=read('src/components/common/inputs/app-currency-input.tsx');
  const viewer=read('src/components/common/evidence-preview-dialog.tsx');
  assert.match(page,/<AppCurrencyInput id="accounting-amount"/);
  assert.match(page,/onValueChange=\{setAmountInput\}/);
  assert.match(page,/parseMoneyInput\(amountInput\)/);
  assert.match(page,/Number\.isSafeInteger\(amount\)/);
  assert.match(input,/inputMode="numeric"/);
  assert.ok(page.includes('<EvidencePreviewDialog preview={preview} onClose={closePreview}'));
  // The approved viewer shows an image at its natural ratio, without zoom/pan controls.
  assert.match(viewer, /max-h-\[80dvh\]/);
  assert.match(viewer, /object-contain/);
  assert.match(viewer, /aria-label="Đóng xem chứng từ"/);
  assert.match(viewer, /aria-label="Tải chứng từ"/);
  assert.match(viewer, /application\/pdf/);
  assert.match(viewer, /Định dạng này chưa hỗ trợ xem trực tiếp/);
  assert.doesNotMatch(viewer, /Phóng to ảnh|Thu nhỏ ảnh|Vừa khung hình|onWheelZoom|setPointerCapture/);
});

test('Contract files, review reasons and audit events remain accessible',()=>{
  assert.ok(detail.includes('<AccountingRenewalInline'));
  for(const token of ['Chứng từ ','Lịch sử xử lý',"openDecision('confirm')",
    "openDecision('request-info')","openDecision('reject')",
    "accessEvidence(period.evidence!,'view')","accessEvidence(period.evidence!,'download')"])
    assert.ok(renewal.includes(token),token);
  assert.ok(page.includes('loadedContractId.current !== selected'));
  assert.ok(detail.includes('Lịch sử xử lý gián đoạn (GI-01)'));
});
