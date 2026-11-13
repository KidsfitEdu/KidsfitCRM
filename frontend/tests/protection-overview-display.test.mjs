import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { protectionAction, protectionServiceStatus } from '../src/components/crm/protection-overview-presentation.ts';

const row=(patch={})=>({
  interruption_status:'CONTINUOUS', protection_status:'PROTECTED',
  renewal_status:'NOT_DUE', has_pending_renewal:false,
  has_open_dispute:false, can_request:false,...patch,
});

test('normal protected school has only service condition; no duplicate action',()=>{
  assert.equal(protectionServiceStatus(row()),'CONTINUOUS');
  assert.equal(protectionAction(row()),null);
});
test('interruption is a service badge, follow-up is a distinct task',()=>{
  const x=row({interruption_status:'INTERRUPTED'});
  assert.equal(protectionServiceStatus(x),'INTERRUPTED');
  assert.deepEqual(protectionAction(x),{status:'FOLLOW_UP',label:'Theo dõi liên hệ'});
});
test('12-month threshold triggers review, never implies release',()=>{
  const x=row({interruption_status:'THRESHOLD_REACHED'});
  assert.equal(protectionServiceStatus(x),'THRESHOLD_REACHED');
  assert.equal(protectionAction(x)?.status,'REVIEW_RIGHTS');
});
test('accounting and manager queues override normal protection',()=>{
  assert.equal(protectionAction(row({has_pending_renewal:true}))?.status,'WAIT_ACCOUNTING');
  assert.equal(protectionAction(row({renewal_status:'PENDING_MANAGER'}))?.status,'WAIT_MANAGER');
});
test('dispute and accounting exceptions remain distinct from service milestone',()=>{
  const dispute=row({interruption_status:'EXCEPTION_DISPUTE',has_open_dispute:true});
  assert.equal(protectionServiceStatus(dispute),'THRESHOLD_REACHED');
  assert.equal(protectionAction(dispute)?.status,'REVIEW_DISPUTE');
  const accounting=row({interruption_status:'EXCEPTION_ACCOUNTING',has_pending_renewal:true});
  assert.equal(protectionServiceStatus(accounting),'THRESHOLD_REACHED');
  assert.equal(protectionAction(accounting)?.status,'WAIT_ACCOUNTING');
});
test('released rights do not accidentally offer old-owner work',()=>{
  const x=row({protection_status:'RELEASED',interruption_status:'RELEASED',can_request:true});
  assert.equal(protectionAction(x),null);
});
test('missing dates and historical gaps show review rather than release',()=>{
  assert.equal(protectionAction(row({interruption_status:'MISSINGSERVICETERM'}))?.status,'VERIFY_PERIOD');
  assert.equal(protectionAction(row({interruption_status:'HISTORICALTHRESHOLDREQUIRESREVIEW'}))?.status,'REVIEW_HISTORY');
});
test('sales protection table retains five columns and no duplicated status badge',()=>{
  const ui=readFileSync(resolve(import.meta.dirname,'../src/components/crm/SalesProtectionOverview.tsx'),'utf8');
  assert.match(ui,/showSummary=\{false\}/);
  assert.match(ui,/protectionServiceStatus\(row\)/);
  assert.match(ui,/protectionAction\(row\)/);
  assert.doesNotMatch(ui,/AppStatusBadge status=\{row\.protection_status\}/);
  assert.doesNotMatch(ui,/AppStatusBadge status=\{row\.status\}/);
  assert.equal((ui.match(/<th className=/g)||[]).length,5);
  assert.match(ui,/aria-label="Không có việc cần xử lý"/);
});

test('Sales protection detail distinguishes rights, service, renewal, and GI-01 history',()=>{
  const ui=readFileSync(resolve(import.meta.dirname,'../src/components/crm/SalesProtectionOverview.tsx'),'utf8');
  for(const label of ['Tổng quan quyền bảo vệ','Bảo vệ hiện tại đến','Ưu tiên Sales cũ đến',
    'Tình trạng sử dụng dịch vụ','Chu kỳ bảo vệ tiếp theo','Lịch sử gián đoạn và quyết định'])
    assert.ok(ui.includes(label),label);
  assert.match(ui,/protectionAction\(selected\)/);
  assert.match(ui,/protectionServiceStatus\(selected\)/);
  assert.match(ui,/historyLoading&&/);
  assert.match(ui,/role="alert"/);
  assert.match(ui,/Tái ký phần mềm hằng năm không tự cộng thêm 5 năm/);
  assert.match(ui,/Mốc gián đoạn 12 tháng được theo dõi độc lập với thời hạn bảo vệ 5 năm/);
  assert.doesNotMatch(ui,/Đang chờ Kế toán: \{selected\.has_pending_renewal/);
});
