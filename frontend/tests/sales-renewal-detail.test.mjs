import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=(path)=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const panel=read('src/components/roles/ContractRenewalSalesPanel.tsx');
const detail=read('src/components/roles/SalesRenewalDetail.tsx');
const api=read('../backend/src/KidsfitCRM.Api/Features/ContractRenewalEndpoints.cs');

test('Sales detail keeps existing Drawer, uses scoped detail API and refreshes per selected record',()=>{
  assert.match(panel,/<AppDrawer open=\{drawer==='detail'\}/);
  assert.match(panel,/<SalesRenewalDetail key=\{activeId\}/);
  assert.match(detail,/\/renewals\/mine\/.*id/);
  assert.match(detail,/setLoading\(false\)/);
  assert.match(detail,/Không tải được chi tiết hồ sơ tái ký/);
  assert.match(detail,/onResubmit/);
  assert.match(detail,/status==='NEEDS_INFO'/);
});
test('renewal detail has clearly separated read-only information, evidence and status',()=>{
  assert.match(detail,/Thông tin hợp đồng tái ký/);
  assert.match(detail,/Hợp đồng đính kèm/);
  assert.match(detail,/Tình trạng xử lý/);
  assert.match(detail,/Ngày ký/);
  assert.match(detail,/Bắt đầu dịch vụ/);
  assert.match(detail,/Kết thúc dịch vụ/);
  assert.match(detail,/Giá trị tái ký/);
  assert.match(detail,/Ngày gửi hồ sơ/);
  assert.match(detail,/Phản hồi Kế toán/);
  assert.match(detail,/Lý do gián đoạn/);
  assert.match(detail,/Chưa có hợp đồng đính kèm/);
});
test('icon-only preview opens a new tab before auth fetch and download keeps direct action',()=>{
  assert.match(detail,/window\.open\('','_blank'\)/);
  assert.match(detail,/tab\.opener=null/);
  assert.match(detail,/tab\.location\.replace\(url\)/);
  assert.match(detail,/Authorization:'Bearer '\+token/);
  assert.match(detail,/if\(!response\.ok\)/);
  assert.match(detail,/link\.download=file\.file_name/);
  assert.match(detail,/if\(tab&&!tab\.closed\)tab\.close\(\)/);
  assert.match(detail,/aria-label=\{'Xem file '/);
  assert.match(detail,/aria-label=\{'Tải xuống '/);
});
test('Sales detail API scopes owner and uploader and never publishes file bytes',()=>{
  assert.match(api,/MapGet\("\/renewals\/mine\/\{id:long\}", MineDetail\)/);
  assert.match(api,/if \(!access\.Has\(Permissions\.ContractRenewalSubmit\)\) return Results\.Forbid\(\)/);
  assert.match(api,/renewal\.SubmittedByUserId == access\.UserId/);
  assert.match(api,/contract\.OwnerUserId == access\.UserId/);
  assert.match(api,/x\.UploadedByUserId == access\.UserId && x\.AttachedAt != null/);
  assert.match(api,/file_name = x\.FileName/);
  assert.match(api,/mime_type = x\.MimeType/);
  assert.doesNotMatch(api.slice(api.indexOf('public static async Task<IResult> MineDetail'),api.indexOf('public static async Task<IResult> MineList')),/Bytes/);
});
