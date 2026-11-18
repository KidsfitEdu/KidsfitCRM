import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
const tree=read('src/screens/Accounting/Contracts/AccountingContractTreeTable.tsx');
const inline=read('src/screens/Accounting/Contracts/AccountingRenewalInline.tsx');
const api=read('../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs');

test('Accounting keeps three tabs and school-grouped seven-column contract tree',()=>{
  for(const tab of ["label:'Hợp đồng'","label:'Khoản thu nhà trường'","label:'Phiếu chi hoa hồng'"]) assert.ok(page.includes(tab));
  assert.ok(page.includes('<AccountingContractTreeTable'));
  assert.equal((tree.match(/<th scope="col"/g)||[]).length,7);
  for(const title of ['Nhà trường','Sales phụ trách','Thời hạn','Giá trị hợp đồng','Tình trạng','Cần xử lý','Thao tác'])
    assert.ok(tree.includes(title),title);
  assert.ok(tree.includes('Mở tất cả')&&tree.includes('Thu gọn tất cả'));
  assert.ok(tree.includes('aria-expanded={!collapsed}'));
  assert.ok(tree.includes('onView(row.id,p.renewalId)'));
  assert.ok(page.includes('<AppDrawer wide compactAccountingHeader'));
});

test('Original contract and each renewal are distinguished by ID, code and financial schedule',()=>{
  assert.ok(tree.includes('Hợp đồng lần đầu'));
  assert.ok(tree.includes("'Tái ký lần '+p.renewal_no"));
  assert.ok(tree.includes('p.contract_code'));
  assert.ok(page.includes('periodScheduleIds.has'));
  assert.ok(page.includes('periodReceiptIds.has'));
  assert.ok(page.includes('const periodLedger='));
  assert.ok(page.includes('const periodPayouts='));
  assert.ok(page.includes('const drawerDetail='));
  assert.ok(page.includes('focusRenewalId={selectedPeriodId}'));
  assert.ok(inline.includes("periods.filter(p=>p.type==='RENEWAL'&&p.id===focusRenewalId)"));
  assert.ok(api.includes('renewalCash.GetValueOrDefault(r.Id)'));
  assert.ok(api.includes('renewalCommission.GetValueOrDefault(r.Id)'));
  assert.ok(api.includes('originalCash.GetValueOrDefault(c.Id)'));
});

test('Accounting filtering scopes authorized school groups before pagination',()=>{
  assert.ok(api.includes('access.Contracts(db).AsNoTracking()'));
  assert.ok(api.includes('c.VerifiedAt.HasValue'));
  assert.ok(api.includes('ServiceInterruptionPolicy.Evaluate'));
  assert.ok(api.includes('service_from'));
  assert.ok(api.includes('service_to'));
  assert.ok(api.includes('needs_action'));
  assert.ok(api.includes('rows.Skip((pn - 1) * size).Take(size)'));
  assert.ok(page.includes("params.set('service_from',appliedServiceFrom)"));
  assert.ok(page.includes("params.set('service_to',appliedServiceTo)"));
  assert.ok(page.includes("params.set('needs_action','true')"));
  assert.ok(page.includes("params.set('month',receiptAppliedMonth)"));
  assert.ok(page.includes('financeAdvancedOpen'));
});

test('GI-01 remains a separate school-wide protection assessment and confirmation uses existing review APIs',()=>{
  for(const token of ['ServiceInterruptionPolicy.Evaluate','today == assessment.ThresholdOn',
    'e.Status == "RELEASED"','!protectedCustomers.Contains(c.CustomerId)'])
    assert.ok(api.includes(token),token);
  assert.ok(page.includes('Tình trạng dịch vụ và quyền bảo vệ toàn nhà trường'));
  assert.ok(inline.includes("'/accounting/renewals/'+activeRenewal"));
  assert.ok(inline.includes('channel_sales.renewal.confirm'));
  assert.ok(inline.includes("openDecision('confirm')"));
  assert.ok(inline.includes("openDecision('request-info')"));
  assert.ok(inline.includes("openDecision('reject')"));
});

test('School-group rows are neutral and the contract term stays on one line',()=>{
  assert.ok(tree.includes('className="border-t-2 border-border bg-background transition-colors hover:bg-muted/20"'));
  assert.doesNotMatch(tree,/bg-emerald-50|bg-emerald-100|bg-emerald-950|bg-emerald-900|even:bg-muted/);
  assert.ok(tree.includes('pl-[60px]'));
  assert.match(tree, /className="whitespace-nowrap px-3 py-3 text-xs tabular-nums"/);
  assert.ok(tree.includes('{channelDate(p.start)} – {channelDate(p.end)}'));
  assert.doesNotMatch(tree,/đến \{channelDate\(p.end\)\}/);
  assert.ok(tree.includes('aria-expanded={!collapsed}'));
});
