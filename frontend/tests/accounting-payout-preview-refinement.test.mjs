import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const accounting=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const viewer=read('src/components/common/evidence-preview-dialog.tsx');

test('Payout records remain in the central workspace rather than contract detail',()=>{
  const detail=read('src/screens/Accounting/Contracts/AccountingContractDetailContent.tsx');
  assert.doesNotMatch(detail,/Lịch sử phiếu chi liên quan|Hoa hồng & phiếu chi/);
  assert.match(accounting,/visiblePayouts\.map\(p=>/);
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
  assert.match(accounting,/submitPayout\(pendingPayoutSubmit\.id\)/);
});
test('shared evidence viewer shows contained images with close/download and PDF fallback, without zoom tools',()=>{
  assert.match(viewer, /<Dialog open=\{preview!==null\}/);
  assert.match(viewer, /<DialogTitle className="sr-only">/);
  assert.match(viewer, /<DialogDescription className="sr-only">/);
  assert.match(viewer, /max-w-\[min\(92vw,560px\)\] max-h-\[80dvh\]/);
  assert.match(viewer, /max-h-\[80dvh\] w-auto max-w-full select-none object-contain/);
  assert.match(viewer, /draggable=\{false\}/);
  assert.match(viewer, /aria-label="Đóng xem chứng từ"/);
  assert.match(viewer, /onClick=\{onClose\}/);
  assert.match(viewer, /aria-label="Tải chứng từ"/);
  assert.match(viewer, /href=\{preview.url\} download=\{preview.name\}/);
  assert.match(viewer, /application\/pdf/);
  assert.match(viewer, /<iframe src=\{preview.url\}/);
  assert.match(viewer, /Định dạng này chưa hỗ trợ xem trực tiếp/);
  assert.doesNotMatch(viewer, /Phóng to ảnh|Thu nhỏ ảnh|Vừa khung hình|ResizeObserver|setPointerCapture|onWheelZoom/);
});
