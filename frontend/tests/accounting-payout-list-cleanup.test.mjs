import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
const part=page.slice(page.indexOf("{accountingTab==='PAYOUTS'&&<AdminListPanel className=\"min-w-0\">"),page.indexOf('<AppDrawer wide compactAccountingHeader'));

test('Accounting payout tab manages eligible candidates and tracked payout records',()=>{
  assert.match(part,/<AdminListPanel className="min-w-0">/);
  assert.match(part,/<AdminListToolbar/);
  assert.match(part,/<table className=\{adminTableClass\+' table-fixed'\}>/);
  assert.doesNotMatch(part,/accounting-eligible-payouts/);
  assert.match(page,/title="Lập phiếu chi hoa hồng"/);
  assert.match(page,/setPayoutPickerOpen\(true\)/);
  assert.match(page,/openCentralPayout\(\{contractId:candidate\.contract_id/);
  assert.match(part,/setPayoutPreview\(p\)/);
  for (const name of ['Người hưởng','Nhà trường','Ngày lập','Ngày chi','Số tiền chi','Trạng thái','Thao tác'])
    assert.ok(part.includes(name),name);
  assert.equal((part.match(/<th scope="col"/g)||[]).length,7);
});
test('All statuses label is concise, with complete payout lifecycle options',()=>{
  assert.match(part,/value:'ALL',label:'Tất cả trạng thái'/);
  assert.doesNotMatch(part,/Mọi trạng thái/);
  for(const value of ['DRAFT','PENDING_APPROVAL','CHANGES_REQUESTED','APPROVED','PAID','CANCELLED','REJECTED'])
    assert.ok(part.includes("value:'"+value+"'"),value);
  assert.match(part,/payoutStatusLabel\(p.status\)/);
  assert.match(part,/<AppStatusBadge\b[^>]*size="sm"[^>]*status=\{p.status\}/);
  assert.match(part,/channelDate\(p.created_at\)/);
  assert.match(part,/channelDate\(p.paid_at\)/);
  assert.match(part,/AppMonthPicker/);
});
test('Search applies on submission, pagination resets with filters, and uses all filtered rows',()=>{
  assert.match(page,/const \[financeAppliedSearch,setFinanceAppliedSearch\]/);
  assert.match(page,/params\.set\('search',financeAppliedSearch\)/);
  assert.match(part,/setFinanceAppliedSearch\(financeSearch\.trim\(\)\);setFinancePage\(1\)/);
  assert.match(page,/const visiblePayouts=payoutRows/);
  assert.match(part,/total=\{payoutTotal\}/);
  assert.match(part,/pageSizeOptions=\{\[10,20,50,100\]\}/);
  assert.match(part,/onPageChange=\{setFinancePage\}/);
  assert.match(part,/onReset=\{resetFinanceFilters\}/);
  assert.match(part,/onValueChange=\{next=>\{setFinanceStatus\(next\);setFinancePage\(1\);\}\}/);
});
test('Payout tracking is UI-only and contract detail workflow remains available',()=>{
  assert.match(page,/accountingTab==='CONTRACTS'/);
  assert.match(page,/openContract\(contractId,renewalId\)/);
  assert.match(page,/\/payouts\/\$\{.*\}\/submit/);
  assert.match(page,/\/accounting\/payouts\?/);
  assert.match(part,/p.beneficiary_name/);
  assert.match(part,/channelMoney\(p.net_amount\)/);
});

test('Accounting tabs use the same underline navigation visual language as Sales',()=>{
  const sales=readFileSync(resolve(import.meta.dirname,'../src/components/roles/SalesFocusPage.tsx'),'utf8');
  for (const className of ['-mb-px','border-b-2','px-1 py-3','border-[#1b5e20]','text-muted-foreground']) {
    assert.ok(page.includes(className), 'Accounting missing '+className);
    assert.ok(sales.includes(className), 'Sales reference missing '+className);
  }
  assert.match(page,/role="tablist" aria-label="Nghiệp vụ Kế toán"/);
  assert.match(page,/role="tab" key=\{item\.key\}/);
  assert.match(page,/aria-selected=\{accountingTab===item\.key\}/);
  assert.match(page,/setAccountingTab\(item\.key\)/);
  assert.match(page,/overflow-x-auto overflow-y-hidden border-b border-border bg-transparent/);
  assert.doesNotMatch(page,/rounded-lg px-4 py-2 text-sm font-semibold transition-colors/);
});

test('Payout filters use creation month, not commission period',()=>{
  assert.match(page,/financeCreatedMonth/);
  assert.match(page,/params\.set\('year',financeCreatedMonth\.slice\(0,4\)\)/);
  assert.match(page,/params\.set\('month',String\(Number\(financeCreatedMonth\.slice\(5,7\)\)\)\)/);
  assert.doesNotMatch(part,/accounting-finance-period/);
  assert.match(part,/Tháng lập phiếu/);
  assert.match(part,/Ngày lập/);
  assert.match(part,/Ngày chi/);
});

test('Payout details use shared drawer with permission-aware fixed footer',()=>{
  assert.match(page,/<AppDrawer open=\{payoutPreview!==null\}/);
  assert.match(page,/title="Chi tiết phiếu chi"/);
  assert.match(page,/footer=\{payoutPreview\?<div/);
  assert.doesNotMatch(page,/<AppDialog open=\{payoutPreview!==null\}/);
  assert.match(page,/payoutPreview\.events\.map/);
  assert.match(page,/payoutPreview\.can_edit/);
  assert.match(page,/payoutPreview\.can_approve/);
  assert.match(page,/payoutPreview\.can_complete/);
  assert.match(page,/payoutPreview\.can_submit/);
});

test('Payout table offers direct BGĐ submission only when backend authorizes it',()=>{
  assert.match(part,/p\.can_submit&&\s*<AdminIconAction icon=\{Send\}/);
  assert.match(part,/Gửi BGĐ phê duyệt phiếu chi/);
  assert.match(part,/onClick=\{\(\)=>setPendingPayoutSubmit\(p\)\}/);
  assert.match(page,/ConfirmDialog open=\{pendingPayoutSubmit!==null\}/);
  assert.match(page,/confirmLabel="Xác nhận gửi"/);
  assert.match(page,/submitPayout\(pendingPayoutSubmit\.id\)/);
  assert.match(page,/if\(payoutSubmitPending\.current\)return/);
  assert.match(page,/setPendingPayoutSubmit\(null\)/);
  assert.match(page,/\/payouts\/\$\{id\}\/submit/);
});

test('Approved payout can start existing complete workflow directly from the table',()=>{
  assert.match(part,/p\.can_complete&&p\.contract_ids\?\.length===1&&/);
  assert.match(part,/<AdminIconAction icon=\{WalletCards\}/);
  assert.match(part,/Ghi nhận chuyển khoản phiếu chi/);
  assert.match(part,/mode:'COMPLETE',payoutId:p\.id/);
  assert.match(part,/disabled=\{saving\}/);
  assert.match(page,/\/payouts\/\$\{payoutId\}\/complete/);
});

test('Payout evidence uses the receipt uploader while preserving FormData proof',()=>{
  assert.match(page,/<AccountingReceiptProofUpload key=\{entryMode==='payout'/);
  assert.match(page,/const proof = form\.get\('proof'\)/);
  assert.match(page,/attachment\.set\('file',proof\)/);
  assert.match(page,/attachment\.set\('payout_id',String\(payoutId\)\)/);
  assert.match(page,/error=\{fieldErrors\.proof\}/);
  assert.doesNotMatch(page,/description="Nhập đúng ngày, số tiền và ảnh chứng từ cho giao dịch\."/);
  const upload=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingReceiptProofUpload.tsx'),'utf8');
  assert.match(upload,/name="proof" type="file" required/);
  assert.match(upload,/MAX_PROOF_SIZE=5\*1024\*1024/);
});
test('Payout money is centered and pending approval badge stays on one line',()=>{
  assert.match(part,/w-\[11%\] px-2 py-3 text-center">Số tiền chi/);
  assert.match(part,/whitespace-nowrap px-2 py-3 text-center font-semibold tabular-nums/);
  assert.match(part,/w-\[14%\] px-2 py-3">Trạng thái/);
  assert.match(part,/className="whitespace-nowrap \[&>span\]:whitespace-nowrap" status=\{p.status\}/);
});

test('Advanced payout filter uses a single accessible icon button',()=>{
  assert.match(part,/aria-label="Bộ lọc nâng cao" title="Bộ lọc nâng cao"/);
  assert.match(part,/aria-expanded=\{financeAdvancedOpen\} aria-controls="accounting-payout-advanced"/);
  assert.match(part,/size-10 shrink-0 rounded-lg p-0/);
  assert.match(part,/<SlidersHorizontal className="size-4" aria-hidden="true"\/>/);
  assert.doesNotMatch(part,/<SlidersHorizontal className="size-4"\/> Bộ lọc nâng cao/);
});
