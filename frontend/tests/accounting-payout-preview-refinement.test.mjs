import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const accounting=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const viewer=read('src/components/common/evidence-preview-dialog.tsx');

test('payout table keeps six columns and displays a short copyable-reference-friendly voucher',()=>{
  assert.match(accounting,/>Mã phiếu<\/th>/);
  for(const name of ['Người hưởng','Ngày chuyển','Số tiền','Trạng thái','Thao tác'])
    assert.match(accounting,new RegExp('>'+name+'<\\/th>'));
  assert.match(accounting,/min-w-\[1000px\] table-fixed/);
  assert.match(accounting,/truncate font-medium" title=\{x\.code\}/);
  assert.match(accounting,/title=\{x\.payment_reference\}/);
  assert.match(accounting,/whitespace-nowrap rounded-full/);
  assert.match(accounting,/channelMoney\(x\.net_amount\)/);
  assert.match(accounting,/x\.paid_at\?channelDate/);
  assert.doesNotMatch(accounting,/BGĐ yêu cầu: \{x\.events/);
});
test('Board change requests open in a popover rather than expanding status rows',()=>{
  assert.match(accounting,/PopoverTrigger type="button" title="Xem yêu cầu bổ sung từ BGĐ"/);
  assert.match(accounting,/MessageSquareText/);
  assert.match(accounting,/PopoverContent side="top" align="end"/);
  assert.match(accounting,/latestRequest\?\.reason\?\.trim\(\)/);
  assert.match(accounting,/max-h-52 overflow-y-auto whitespace-pre-wrap break-words/);
  assert.match(accounting,/x\.status==='CHANGES_REQUESTED'&&<Popover>/);
});
test('editing a returned payout shows the latest Board request above the form',()=>{
  assert.match(accounting,/editingPayout\?\.status==='CHANGES_REQUESTED'/);
  assert.match(accounting,/editingPayout\.events\.filter\(event=>event\.event_type==='CHANGES_REQUESTED'\)\.at\(-1\)/);
  assert.match(accounting,/BGĐ yêu cầu bổ sung/);
  assert.match(accounting,/onClick=\{\(\)=>openDraft\(x\)\}/);
  assert.match(accounting,/onClick=\{\(\)=>void submitPayout\(x\.id\)\}/);
});
test('shared image viewer is headerless/footerless and uses measured fit-to-screen presentation',()=>{
  assert.match(viewer,/min\(1, stageSize\.width\/imageSize\.width, stageSize\.height\/imageSize\.height\)/);
  assert.match(viewer,/ResizeObserver/);
  assert.match(viewer,/naturalWidth/);
  assert.match(viewer,/naturalHeight/);
  assert.match(viewer,/min-h-0 flex-1 overflow-auto/);
  assert.match(viewer,/pointer-events-none absolute bottom-4 left-1\/2/);
  assert.match(viewer,/absolute right-4 top-4/);
  assert.match(viewer,/Vừa khung hình/);
  assert.match(viewer,/Tải chứng từ/);
  assert.match(viewer,/application\/pdf/);
  assert.match(viewer,/setPointerCapture/);
  assert.match(viewer,/releasePointerCapture/);
  assert.doesNotMatch(viewer,/border-t border-white/);
  assert.doesNotMatch(viewer,/className="flex shrink-0 flex-wrap items-center justify-between/);
});
