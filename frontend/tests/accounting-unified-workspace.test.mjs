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
  assert.ok(page.includes('<AppDrawer compactHeader'));
});

test('Original contract and each renewal are distinguished by ID, code and financial schedule',()=>{
  assert.ok(tree.includes('Hợp đồng lần đầu'));
  assert.ok(tree.includes("'Tái ký lần '+p.renewal_no"));
  assert.ok(tree.includes('p.contract_code'));
  const contractDetail=read('src/screens/Accounting/Contracts/AccountingContractDetailContent.tsx');
  assert.ok(contractDetail.includes('renewal?.contract_code'));
  assert.ok(contractDetail.includes('renewal?.total_value'));
  assert.ok(contractDetail.includes('focusRenewalId={selectedPeriodId}'));
  assert.doesNotMatch(contractDetail,/Lịch thanh toán theo hợp đồng|Nhà trường thanh toán|Hoa hồng & phiếu chi/);
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
  assert.ok(read('src/screens/Accounting/Contracts/AccountingContractDetailContent.tsx').includes('Tình trạng dịch vụ và quyền bảo vệ toàn nhà trường'));
  assert.ok(inline.includes("'/accounting/renewals/'+activeRenewal"));
  assert.ok(inline.includes('channel_sales.renewal.confirm'));
  assert.ok(inline.includes("openDecision('confirm')"));
  assert.ok(inline.includes("openDecision('request-info')"));
  assert.ok(inline.includes("openDecision('reject')"));
});

test('School-group rows are neutral and the contract term stays on one line',()=>{
  assert.ok(tree.includes('className="border-t-2 border-border bg-background transition-colors hover:bg-muted/20"'));
  assert.doesNotMatch(tree,/bg-emerald-50|bg-emerald-100|bg-emerald-950|bg-emerald-900|even:bg-muted/);
  assert.ok(tree.includes('crm-contract-school-cell'));
  assert.ok(tree.includes('font-semibold tabular-nums'));
  assert.ok(tree.includes('<th scope="col" className="px-2 py-3 text-left whitespace-nowrap">Thời hạn</th>'));
  assert.ok(tree.includes('whitespace-nowrap px-2 py-3 text-left text-[13px] font-normal tabular-nums'));
  assert.ok(tree.includes('<dd className="mt-1 font-normal tabular-nums">'));
  assert.ok(tree.includes('{channelDate(p.start)} – {channelDate(p.end)}'));
  assert.doesNotMatch(tree,/đến \{channelDate\(p.end\)\}/);
  assert.ok(tree.includes('aria-expanded={!collapsed}'));
});

test('Contract table reserves space for all three authorized review actions',()=>{
  assert.match(tree, /<colgroup>/);
  for(const percent of ['24%','13%','17%','7%'])assert.ok(tree.includes(percent));
  assert.ok(tree.includes("<col style={{width:'13%'}}/>"));
  assert.ok(tree.includes('whitespace-nowrap">Giá trị hợp đồng'));
  assert.ok(tree.includes('icon={Eye}'));
  assert.ok(tree.includes('icon={CheckCircle2}'));
  assert.ok(tree.includes('icon={FilePenLine} tone="blue"'));
  assert.ok(tree.includes("p.status==='PENDING_ACCOUNTING'&&canRequestInfo"));
  assert.ok(page.includes("openRenewal(contractId,renewalId,'request-info')"));
  assert.ok(page.includes("channel_sales.renewal.review"));
});

test('Contract tree fits the accounting panel and has no forced horizontal scroll',()=>{
  const css=read('src/app/globals.css');
  assert.ok(tree.includes("adminTableClass.replace('min-w-[760px]','min-w-0')"));
  assert.doesNotMatch(tree,/min-w-\[1240px\]|overflow-x-auto/);
  assert.ok(tree.includes('className="@container min-w-0"'));
  assert.ok(tree.includes('@min-[1100px]:block'));
  assert.ok(tree.includes('@min-[1100px]:hidden'));
  assert.ok(tree.includes('<CompactGroup'));
  assert.ok(tree.includes('<ContractActions'));
  assert.ok(css.includes('table.crm-accounting-contract-table tbody td'));
  assert.ok(css.includes('table.crm-accounting-contract-table tbody td.crm-contract-school-cell'));
});

test('Contract values and column heading shift left together while remaining right-aligned',()=>{
  const css=read('src/app/globals.css');
  assert.ok(tree.includes('className="crm-contract-amount-cell px-3 py-3 text-right whitespace-nowrap"'));
  assert.ok(tree.includes('className="crm-contract-amount-cell whitespace-nowrap px-2 py-3 text-right font-semibold tabular-nums"'));
  assert.ok(css.includes('thead th.crm-contract-amount-cell,'));
  assert.ok(css.includes('tbody td.crm-contract-amount-cell {'));
  assert.ok(css.includes('padding-right: 1.25rem;'));
});
