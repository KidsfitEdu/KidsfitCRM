import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');

test('Accounting dashboard uses real finance totals and shared KPI cards',()=>{
  const s=read('src/screens/Accounting/Dashboard/DashboardPage.tsx');
  assert.match(s, /<AppPageHeader eyebrow="KẾ TOÁN \/ KIDSFIT CRM"/);
  assert.match(s, /<AppStatCard key=\{tile.label\}/);
  assert.match(s, /finance\.data\?\.summary/);
  assert.match(s, /'—'/);
  assert.match(s, /finance\.refetch\(\)/);
  assert.match(s, /onSalesNavigate\?\.\('role-accounting-revenue'\)/);
  assert.doesNotMatch(s, /mockRevenue|fakeRevenue|Math\.random/);
});

test('Accounting contract and payout lists share rounded cards, action icons and status badges',()=>{
  const s=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.match(s, /accountingTab==='CONTRACTS'&&<AdminListPanel className="min-w-0"/);
  assert.match(s, /accountingTab==='PAYOUTS'&&<AdminListPanel className="min-w-0">/);
  assert.match(s, /<thead className=\{adminTableHeadClass\}>/);
  assert.match(s, /<AppPageHeader eyebrow="KẾ TOÁN \/ KIDSFIT CRM"/);
  assert.match(s, /filters=\{<AppSelect ariaLabel="Lọc năm nhận tiền"/);
  assert.match(s, /tone="blue" label=\{'Sửa phiếu chi '/);
  assert.match(s, /<AdminIconAction icon=\{Eye\} onClick=\{\(\)=>setSelected\(row\.id\)\}/);
  assert.match(s, /<AppStatusBadge size="sm" status=\{p\.status\}/);
  assert.match(s, /<item\.icon className="size-4 shrink-0"/);
  assert.match(s, /\[scrollbar-width:none\]/);
});

test('Accounting transaction form maintains validation and consistent actions',()=>{
  const s=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.match(s, /<AppDialog open=\{Boolean\(detail && entryMode==='payout'\)\}/);
  assert.match(s, /financialTransactionForm/);
  assert.match(s, /<AppDialog open=\{receiptIntent\}/);
  assert.match(s, /<AppCurrencyInput id="accounting-amount"/);
  assert.match(s, /<AppButton type="button" tone="neutral" disabled=\{saving\}/);
  assert.match(s, /<AppButton type="submit" tone="green" busy=\{saving\}/);
  assert.match(s, /focus-visible:ring-ring\/50/);
  assert.match(s, /fieldErrors\.proof/);
  assert.match(s, /fieldErrors\.amount/);
});
