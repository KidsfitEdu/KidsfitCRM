import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const ui=read('src/screens/Accounting/Contracts/AccountingRenewalInline.tsx');
const sales=read('src/components/crm/SalesContractPeriodHistory.tsx');
const api=read('../backend/src/KidsfitCRM.Api/Features/ContractRenewalEndpoints.cs');
const source=api.slice(api.indexOf('public static async Task<IResult> AccountingPeriods('),
  api.indexOf('private static IQueryable<ContractRenewal> ScopedAccounting('));

test('Accounting history visually matches Sales: source contract and renewals in one accordion',()=>{
  for(const phrase of ['Hồ sơ hợp đồng đang xem','Hợp đồng lần đầu','Tái ký lần ',
    'aria-expanded={expanded}','aria-controls={\'accounting-period-\'+key}',
    'Chứng từ ','Lịch sử xử lý','Giá trị hợp đồng','Kỳ sử dụng'])
    assert.ok(ui.includes(phrase),phrase);
  assert.ok(ui.includes('rounded-2xl border border-border/70 bg-card p-4 shadow-sm'));
  assert.ok(sales.includes('rounded-2xl border border-border bg-card'));
  for(const phrase of ['overflow-hidden rounded-xl border border-border',
    'border-t border-border px-3 py-4','ChevronUp','ChevronDown','AppStatusBadge'])
    assert.ok(ui.includes(phrase)&&sales.includes(phrase),phrase);
  assert.match(ui,/response\.data\.find\(p=>p\.type==='RENEWAL'&&p\.status==='PENDING_ACCOUNTING'\)/);
  assert.match(ui,/const latest=response\.data\.at\(-1\)/);
  assert.match(ui,/periods\.filter\(p=>p\.type==='RENEWAL'&&p\.id===focusRenewalId\)/);
  assert.match(ui,/setSelected\(expanded\?null:key\)/);
  assert.doesNotMatch(ui,/<AppDrawer/);
});
test('Accounting renewal actions and reasons retain original security and endpoints',()=>{
  assert.match(ui,/channel_sales\.renewal\.review/);
  assert.match(ui,/channel_sales\.renewal\.confirm/);
  assert.match(ui,/detail\.data\.status!=='PENDING_ACCOUNTING'/);
  assert.match(ui,/period\.type==='RENEWAL'&&period\.status==='PENDING_ACCOUNTING'&&canReview/);
  assert.match(ui,/decision!=='request-info'&&!canConfirm/);
  assert.match(ui,/if\(decision!=='confirm'&&!reason\.trim\(\)\)/);
  assert.match(ui,/Xác nhận tái ký/);
  assert.match(ui,/Yêu cầu bổ sung/);
  assert.match(ui,/Từ chối/);
  assert.match(ui,/\/accounting\/renewals\/.*\+decision/);
  assert.match(ui,/await onChanged\(\)/);
});

test('Accounting renewal decisions open a shared branded confirmation dialog instead of an inline form',()=>{
  assert.match(ui, /<AppDialog open=\{decision!==null\}/);
  const dialog=ui.slice(ui.indexOf('<AppDialog open={decision!==null}'),ui.indexOf('</AppDialog>')+12);
  assert.doesNotMatch(dialog, /description=|rounded-xl border border-border\/70 bg-muted\/20|CRM tự kiểm tra quyền bảo vệ/);
  assert.match(dialog, /Bạn có chắc chắn muốn xác nhận tái ký hợp đồng của/);
  assert.match(dialog, /<strong>\{detail\?\.data\.school_name/);
  assert.match(dialog, /Nội dung cần bổ sung/);
  assert.match(dialog, /Lý do từ chối/);

  assert.match(ui, /busy=\{busy\} contentClassName="sm:max-w-lg"/);
  for(const decision of ["confirm","request-info","reject"])
    assert.ok(ui.includes("openDecision('"+decision+"')"),decision);
  assert.match(ui, /onOpenChange=\{open=>\{if\(!open\)closeDecision\(\);\}\}/);
  assert.match(ui, /const closeDecision=\(\)=>\{if\(!busy\)/);
  assert.match(ui, /<Textarea ref=\{reasonRef\} id="accounting-renewal-decision-reason" required maxLength=\{1000\}/);
  assert.match(ui, /reasonRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(ui, /autoFocus/);
  assert.match(ui, /decision==='confirm'/);
  assert.match(ui, /disabled=\{!decision \|\| \(decision!=='confirm'&&!reason\.trim\(\)\)\}/);
  assert.match(ui, /<AppButton type="button" tone=\{decision==='reject'\?'danger':'green'\}/);
  assert.match(ui, /busy=\{busy\}/);
  assert.doesNotMatch(ui, /\{decision&&<div className="space-y-2 rounded-lg border border-border p-3"/);
});

test('Accounting period history is scoped and never treats pending renewal as confirmed service',()=>{
  assert.match(api,/MapGet\("\/accounting\/contracts\/\{contractId:long\}\/periods", AccountingPeriods\)/);
  assert.match(api,/RequireAuthorization\(Permissions\.ContractRenewalReview\)/);
  assert.match(source,/access\.Has\(Permissions\.ContractRenewalReview\)/);
  assert.match(source,/access\.Contracts\(db\)\.AsNoTracking\(\)/);
  assert.match(source,/c\.Id == contractId && c\.VerifiedAt != null/);
  assert.match(source,/access\.CanManageOrganization\(contract\.OwnerOrganizationId\)/);
  assert.match(source,/r\.ContractId == contractId/);
  assert.match(source,/renewal\.Status == "CONFIRMED"/);
  assert.match(source,/e\.AttachedAt != null/);
  assert.match(source,/renewalIds\.Contains\(e\.ContractRenewalId\.Value\)/);
  assert.match(ui,/!period\.service_confirmed/);
});
test('Evidence file supports authorised new-tab view and download without nested drawers',()=>{
  assert.match(ui,/window\.open\('','_blank'\)/);
  assert.match(ui,/fetch\(apiBase\+'\/channel-sales\/evidence\/'\+evidence\.id/);
  assert.match(ui,/tab\.opener=null/);
  assert.match(ui,/URL\.createObjectURL/);
  assert.match(ui,/URL\.revokeObjectURL/);
  assert.match(ui,/link\.download=evidence\.file_name/);
  assert.match(ui,/aria-label=\{'Xem '\+period\.evidence\.file_name\}/);
  assert.match(ui,/aria-label=\{'Tải '\+period\.evidence\.file_name\}/);
});
test('Processing event codes are presented in Vietnamese and long reasons wrap',()=>{
  for(const phrase of ['SUBMITTED:\'Đã gửi hồ sơ\'','RESUBMITTED:\'Đã gửi lại hồ sơ\'',
    'CONFIRMED:\'Kế toán đã xác nhận\'','NEEDS_INFO:\'Kế toán yêu cầu bổ sung\'',
    'REJECTED:\'Kế toán đã từ chối\'','whitespace-pre-wrap break-words'])
    assert.ok(ui.includes(phrase),phrase);
  assert.match(ui,/eventLabels\[event\.event_type\]/);
});
