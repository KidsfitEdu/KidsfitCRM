import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test('Sales dashboard uses branded KPI and actionable task cards', () => {
  const source = read('src/components/roles/SalesDashboard.tsx');
  assert.match(source, /<AppStatCard icon=\{Handshake\}/);
  assert.match(source, /<section aria-labelledby="sales-priority-heading"/);
  assert.match(source, /<AdminIconAction icon=\{ArrowUpRight\}/);
  assert.match(source, /onClick=\{\(\)=>go\(item\.target\)\}/);
});

test('Sales proposal list distinguishes actions and workflow statuses', () => {
  const source = read('src/components/roles/SalesProposalTable.tsx');
  assert.match(source, /<SalesListLayout/);
  assert.match(source, /<AppStatusBadge/);
  assert.match(source, /PENDING_MANAGER: 'warning'/);
  assert.match(source, /APPROVED: 'success'/);
  assert.match(source, /REJECTED: 'danger'/);
  assert.match(source, /icon=\{Pencil\} tone="blue"/);
  assert.match(source, /icon=\{Trash2\} tone="red"/);
});

test('Sales invitation list represents actionable states with semantic badges', () => {
  const source = read('src/components/roles/SalesInvitationList.tsx');
  assert.match(source, /<AppStatusBadge size="sm"/);
  assert.match(source, /PENDING: 'warning'/);
  assert.match(source, /ACCEPTED: 'success'/);
  assert.match(source, /REJECTED: 'danger'/);
  assert.match(source, /x\.is_expired \? 'danger'/);
  assert.match(source, /onAccept\(x\)/);
  assert.match(source, /onReject\(x\)/);
});

test('Sales income overview uses shared stat cards without changing API values', () => {
  const source = read('src/components/roles/SalesIncomePage.tsx');
  assert.match(source, /<AppStatCard icon=\{Wallet\}/);
  assert.match(source, /data\.summary\.accrued/);
  assert.match(source, /data\.summary\.paid/);
  assert.match(source, /data\.summary\.unpaid/);
  assert.match(source, /data\.summary\.contracts/);
  assert.match(source, /data \? channelMoney\(data\.summary\.accrued\) : '—'/);
  assert.match(source, /data \? data\.summary\.contracts : '—'/);
});

test('Sales customer state colors distinguish approach, pending review, and verification', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  assert.match(source, /APPROACHING:[\s\S]*?border-sky-200/);
  assert.match(source, /'Chờ Quản lý duyệt', compact: 'Hồ sơ đã gửi', className: amber/);
  assert.match(source, /'Chờ CHECKEE xác minh', compact: 'CHECKEE đang xử lý', className: amber/);
});

test('Sales customer tabs use four semantic icons and preserve access controls', () => {
  const source = read('src/components/roles/SalesFocusPage.tsx');
  for (const [label,icon] of [
    ['Trường đang phụ trách','School'],
    ['Chờ nhận phân bổ','UserRoundPlus'],
    ['Hợp đồng tái ký','FilePenLine'],
    ['Quản lý quyền bảo vệ','ShieldCheck'],
  ]) {
    assert.match(source, new RegExp(`label:'${label}',icon:${icon}`));
  }
  assert.match(source, /<item\.icon className="size-4 shrink-0" aria-hidden="true"\/>/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /onClick=\{\(\) => setSubview\(item\.id as typeof subview\)\}/);
  assert.match(source, /can\('channel_sales\.renewal\.submit'\)/);
  assert.match(source, /can\('channel_sales\.customer\.view'\)/);
});

test('Sales overview presents role-scoped KPI and operational tasks without fabricated history', () => {
  const source = read('src/components/roles/SalesDashboard.tsx');
  assert.match(source, /title="Tổng quan bán hàng"/);
  assert.match(source, /<AppStatCard icon=\{Handshake\}/);
  assert.match(source, /Công việc cần theo dõi/);
  assert.doesNotMatch(source, /Lịch tư vấn sắp tới|nextFollowups|next_follow_up_at|adminTableHeadClass/);
  assert.match(source, /md:grid-cols-3/);
  assert.match(source, /operations\.data/);
  assert.match(source, /Làm mới tổng quan bán hàng/);
  assert.doesNotMatch(source, /revenue_trend|mockTrend|fakeData/);
});

test('Sales school drawer and modal form reuse branded shared primitives', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  assert.match(source, /title="Thông tin trường học"/);
  assert.match(source, /<SchoolProfileDetails units=\{schoolProfile\.school_units\}/);
  assert.match(source, /bodyClassName="space-y-4 bg-muted\/10"/);
  assert.match(source, /<AppDialog open onOpenChange/);
  assert.match(source, /<AppButton type="button" tone="neutral" disabled=\{saving\}/);
  assert.match(source, /<AppButton type="submit" tone="green" busy=\{saving\}/);
});

test('Sales school list remains rounded and school drawer matches the shared scrolling pattern', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  const drawer = read('src/components/common/drawers/app-drawer.tsx');
  const protection = read('src/components/crm/SalesProtectionOverview.tsx');
  assert.match(source, /embedded \? 'overflow-hidden rounded-2xl border-0 ring-0 bg-card shadow-sm'/);
  assert.match(source, /title="Thông tin trường học" compactHeader/);
  assert.match(source, /bodyClassName="space-y-4 bg-muted\/10"/);
  assert.doesNotMatch(source, /scrollbar-width:none|webkit-scrollbar.*hidden|alignToViewportEdge|extendHeaderToViewportEdge/);
  assert.match(protection, /<AppDrawer wide open=/);
  assert.match(protection, /bodyClassName="bg-muted\/15"/);
  assert.match(drawer, /overflow-hidden border-l/);
  assert.match(drawer, /overflow-y-auto overscroll-contain/);
  assert.match(drawer, /compactHeader\?: boolean/);
  assert.doesNotMatch(drawer, /alignToViewportEdge|extendHeaderToViewportEdge|calc\(100% - 100vw\)/);
  assert.match(source, /<SchoolProfileDetails units=\{schoolProfile\.school_units\}/);
});

test('Right-side CRM sheet removes root scrollbar gutter without changing scroll locking', () => {
  const css = read('src/app/globals.css');
  const sheet = read('src/components/ui/sheet.tsx');
  const drawer = read('src/components/common/drawers/app-drawer.tsx');
  assert.match(css, /html:has\(\[data-slot="sheet-content"\]\[data-side="right"\]\)/);
  assert.match(css, /scrollbar-gutter: auto !important/);
  assert.match(css, /overflow: hidden !important/);
  assert.match(css, /html:has\(\[data-slot="sheet-content"\]\[data-side="right"\]\) body \{/);
  assert.match(css, /width: 100% !important/);
  assert.doesNotMatch(css, /overflow: visible !important/);
  assert.match(sheet, /data-side=\{side\}/);
  assert.match(drawer, /overflow-y-auto overscroll-contain/);
  assert.doesNotMatch(drawer, /alignToViewportEdge|extendHeaderToViewportEdge/);
});

test('Sales school action icons distinguish view, edit and history in both list modes', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  const row = source.slice(source.indexOf('function CustomerRow({'), source.indexOf('function ExtensionDialog({'));
  assert.match(row, /border-green-700 text-green-800[\s\S]*?onClick=\{onOpenDetail\}/);
  assert.match(row, /border-sky-600 text-sky-700[\s\S]*?onClick=\{onActivity\}/);
  assert.match(row, /border-slate-300 text-slate-600[\s\S]*?onClick=\{onHistory\}/);
  assert.ok(row.includes('aria-label={`Cập nhật tư vấn ${customer.display_name}`}'));
  assert.doesNotMatch(row, /: 'Chưa có lịch hẹn'/);
  assert.match(row, /\{customer\.next_follow_up_at && \(/);
});
