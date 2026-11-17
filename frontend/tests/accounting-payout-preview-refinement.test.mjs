import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const accounting=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const viewer=read('src/components/common/evidence-preview-dialog.tsx');

test('payout history in contract drawer is compact and the central workspace stays actionable',()=>{
  assert.doesNotMatch(accounting,/min-w-\[1000px\] table-fixed/);
  assert.match(accounting,/Lịch sử phiếu chi liên quan/);
  assert.match(accounting,/payoutVisible\.map\(x=>/);
  assert.match(accounting,/channelMoney\(x\.net_amount\)/);
  assert.match(accounting,/payoutPreview\.events\.map\(/);
  assert.match(accounting,/contract_ids\?\.length!==1/);
  assert.match(accounting,/setPayoutPreview\(p\)/);
});
test('Board change requests are readable in a central payout detail and still appear when editing',()=>{
  assert.match(accounting,/payoutPreview\.events/);
  assert.match(accounting,/event\.reason/);
  assert.match(accounting,/editingPayout\?\.status==='CHANGES_REQUESTED'/);
  assert.match(accounting,/editingPayout\.events\.filter\(event=>event\.event_type==='CHANGES_REQUESTED'\)\.at\(-1\)/);
  assert.match(accounting,/BGĐ yêu cầu bổ sung/);
  assert.match(accounting,/mode:'EDIT'/);
  assert.match(accounting,/submitPayout\(id\)/);
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
