import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { canonicalSalesView, legacySalesWorkflowTab, salesMenuIds } from '../src/config/sales-navigation.ts';

const root = resolve(import.meta.dirname, '..');
const read = name => readFileSync(resolve(root,name),'utf8');

test('Employee and collaborator Sales share exactly five canonical menu entries', () => {
  assert.equal(salesMenuIds.length, 5);
  assert.equal(new Set(salesMenuIds).size, 5);
  assert.deepEqual(salesMenuIds,[
    'role-sales-staff-dashboard',
    'role-sales-staff-schools',
    'role-sales-staff-customers',
    'role-sales-staff-proposals',
    'role-sales-staff-income',
  ]);
  const app = read('src/components/crm/crm-app.tsx');
  assert.match(app, /isSales \? salesMenuIds\.includes\(item\.id\)/);
  assert.match(app, /currentView\.startsWith\('role-sales-staff-'\)/);
});

test('Every legacy collaborator deep link resolves without losing invitation or extension context', () => {
  const aliases = {
    'role-sales-staff-activities':'role-sales-staff-customers',
    'role-collaborator-dashboard':'role-sales-staff-dashboard',
    'role-collaborator-schools':'role-sales-staff-schools',
    'role-collaborator-proposals':'role-sales-staff-proposals',
    'role-collaborator-invitations':'role-sales-staff-customers',
    'role-collaborator-approaches':'role-sales-staff-customers',
    'role-collaborator-extensions':'role-sales-staff-customers',
    'role-collaborator-income':'role-sales-staff-income',
  };
  for (const [source,target] of Object.entries(aliases)) assert.equal(canonicalSalesView(source),target);
  assert.equal(legacySalesWorkflowTab('role-collaborator-invitations'),'invitations');
  assert.equal(legacySalesWorkflowTab('role-collaborator-extensions'),'extensions');
  assert.equal(legacySalesWorkflowTab('role-sales-staff-activities'),undefined);
  const app = read('src/components/crm/crm-app.tsx');
  assert.match(app, /isSales \? canonicalSalesView\(requested\) : requested/);
  assert.match(app, /legacySalesWorkflowTab\(requested\)/);
});

test('Sales pages use focused customer subsets and retain original authorized actions', () => {
  const focus = read('src/components/roles/SalesFocusPage.tsx');
  const view = read('src/components/crm/channel-sales-view.tsx');
  assert.match(focus, /title: 'Trường của tôi'/);
  assert.match(focus, /title: 'Trường của tôi'/);
  assert.match(focus, /id:'invitations'/);
  // The extension tab was removed; requests are available from the active-school row.
  assert.doesNotMatch(focus, /id:'extensions'/);
  assert.match(view, /activeApproach &&/);
  assert.match(view, /extensionBlocked/);
  assert.match(focus, /onRegister=\{props\.onRegister\}/);
  assert.match(focus, /onAddActivity=\{props\.onAddActivity\}/);
  assert.match(focus, /onReportContract=\{props\.onReportContract\}/);
  assert.match(view, /mode === 'all' && <section/);
  assert.match(view, /customer\.can_manage_approach/);
  assert.match(view, /canRegister=\{mode === 'all' && canRegister\}/);
});

test('Shared Admin/Manager paths remain unchanged and embedded compact mode is opt-in', () => {
  const role = read('src/components/roles/RoleOperationsPage.tsx');
  const channel = read('src/components/crm/channel-operations.tsx');
  const school = read('src/components/crm/school-operations.tsx');
  assert.match(role, /if \(profile === 'SalesStaff'\)/);
  assert.match(role, /const sections: Record<string, SectionDefinition> = rolePageSections\[profile\]/);
  assert.match(channel, /compactOperations = false/);
  assert.match(school, /compactHeader = false/);
  assert.match(school, /compactHeader && active === 'proposals'/);
});

test('Sales underline tabs and proposal table retain shared role layouts', () => {
  const focus = read('src/components/roles/SalesFocusPage.tsx');
  const operations = read('src/components/crm/channel-operations.tsx');
  const directory = read('src/components/crm/school-directory.tsx');
  const proposals = read('src/components/crm/school-operations.tsx');
  const table = read('src/components/roles/SalesProposalTable.tsx');
  assert.match(focus, /lg:w-\[30%\]/);
  assert.match(focus, /border-b-\[3px\] bg-transparent/);
  assert.match(focus, /border-\[#1b5e20\]/);
  assert.match(focus, /min-w-0 bg-white dark:bg-card/);
  assert.doesNotMatch(focus, /rounded-t-\[24px\]/);
  assert.match(focus, /actions=\{canCreateProposal \?/);
  assert.match(focus, /embeddedSalesTable=\{section === 'proposals' \|\| isInvitations\}/);
  assert.match(focus, /embedded=\{section === 'customers' \|\| section === 'activities'\}/);
  assert.match(operations, /!compactOperations && visiblePanel !== 'customers'/);
  assert.match(operations, /registrationIconOnly=\{compactOperations\}/);
  assert.match(directory, /UserRoundPlus/);
  assert.match(directory, /aria-label=\{registrationIconOnly \?/);
  assert.match(proposals, /embeddedSalesTable && active === 'proposals'/);
  assert.match(table, /<SalesListLayout/);
  assert.doesNotMatch(table, /<table/);
  assert.match(table, /<SalesListToolbar/);
  assert.doesNotMatch(table, /Thêm mới/);
  assert.match(focus, />Thêm mới<\/AppButton>/);
  assert.match(proposals, /proposalActionRef\.current = \{ open: openProposal \}/);
  assert.match(proposals, /embeddedSalesTable && active === 'invitations'/);
});

test('Sales actions and footer pagination remain accessible and scoped', () => {
  const focus = read('src/components/roles/SalesFocusPage.tsx');
  const sales = read('src/components/crm/channel-sales-view.tsx');
  const dashboard = read('src/components/roles/SalesDashboard.tsx');
  const operations = read('src/components/crm/school-operations.tsx');
  const proposals = read('src/components/roles/SalesProposalTable.tsx');
  const finance = read('src/components/crm/channel-operations.tsx');
  const pager = read('src/components/common/app-pagination.tsx');
  assert.ok(focus.includes("section === 'customers'"));
  assert.ok(focus.includes("min-w-0 bg-white dark:bg-card"));
  assert.ok(sales.includes('pageSizeOptions={[10,20,50,100]}'));
  assert.ok(sales.includes('serverMine ? minePage?.total ?? 0 : customers.length'));
  assert.ok(sales.includes('aria-label={`Cập nhật tư vấn ${customer.display_name}`}'));
  assert.ok(sales.includes('aria-label={`Báo hợp đồng ${customer.display_name}`}'));
  assert.ok(dashboard.includes('aria-label={`Xem hoạt động tư vấn ${customer.display_name}`}'));
  assert.ok(operations.includes('Nhận trường ${x.school_name}'));
  assert.ok(operations.includes('Từ chối gia hạn ${x.school_name}'));
  assert.ok(operations.includes('<AppPagination page={preview ? 1 : page}'));
  assert.ok(operations.includes('onPageSizeChange={size => {setSalesPageSize(size);setPage(1);}}'));
  assert.ok(finance.includes('total={data.ledger.length}'));
  assert.ok(finance.includes('total={data.payouts.length}'));
  assert.ok(pager.includes('fixedPageSize'));
});

test('Sales screens share list toolbar, rows, and pagination without duplicate HTML tables', () => {
  const income = read('src/components/roles/SalesIncomePage.tsx');
  const proposal = read('src/components/roles/SalesProposalTable.tsx');
  const invitations = read('src/components/roles/SalesInvitationList.tsx');
  const common = read('src/components/common/sales-list.tsx');
  const operations = read('src/components/crm/school-operations.tsx');
  for (const screen of [income, proposal, invitations]) {
    assert.match(screen, /<SalesListLayout/);
    assert.match(screen, /<SalesListToolbar/);
    assert.match(screen, /<SalesListRow/);
  }
  assert.doesNotMatch(income, /<table/);
  assert.doesNotMatch(proposal, /<table/);
  assert.match(common, /<AppPagination/);
  assert.match(common, /pageSizeOptions=\{\[10,20,50,100\]\}/);
  assert.match(operations, /page_size=/);
  assert.match(operations, /onAccept=\{x => setAction/);
  assert.match(operations, /onReject=\{x => setAction/);
});

test('Income simplification and Sales page-size selection stay consistent', () => {
  const income = read('src/components/roles/SalesIncomePage.tsx');
  const focus = read('src/components/roles/SalesFocusPage.tsx');
  const operations = read('src/components/crm/school-operations.tsx');
  const shared = read('src/components/common/sales-list.tsx');
  assert.doesNotMatch(income, /Kỳ hoa hồng|Lịch sử phiếu chi của tôi|Chưa nhận có thể gồm/);
  assert.match(income, /Tổng hoa hồng/);
  assert.match(income, /CHI TIẾT HOA HỒNG/);
  assert.doesNotMatch(focus, /Đề xuất mới chỉ được thêm vào danh bạ/);
  assert.match(operations, /const pageSize = embeddedSalesTable \? salesPageSize/);
  assert.match(operations, /setTab\(initialTab\)/);
  assert.match(operations, /onPageSizeChange=\{size => \{ setSalesPageSize\(size\); setPage\(1\); \}\}/);
  assert.match(shared, /disabled=\{loading\}/);
});

test('Sales consultation update has one content input and never invents a classified outcome', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  const start = source.indexOf('function ActivityDialog({');
  const end = source.indexOf('function ContractDialog({', start);
  assert.ok(start > 0 && end > start);
  const dialog = source.slice(start, end);
  assert.match(dialog, /title="Cập nhật kết quả tư vấn"/);
  assert.match(dialog, /name="content"/);
  assert.match(dialog, /maxLength=\{4000\}/);
  assert.match(dialog, /activity_type: 'NOTE', content/);
  assert.match(dialog, /appNotice\.success\('Đã lưu nội dung trao đổi\.'/);
  assert.doesNotMatch(dialog, /name="outcome"|name="activity_type"|name="occurred_at"|name="next_follow_up_at"/);
  assert.doesNotMatch(dialog, /outcome: 'INTERESTED'/);
});

test('Sales contract report does not ask for a contract code', () => {
  const view = read('src/components/crm/channel-sales-view.tsx');
  const start = view.indexOf('function ContractDialog({');
  const end = view.indexOf('function ReceiptDialog({', start);
  assert.ok(start >= 0 && end > start);
  const form = view.slice(start, end);
  assert.doesNotMatch(form, /name="contract_code"|contract_code: text\(form/);
  assert.match(form, /name="contract_file"/);
  assert.match(form, /label="Gửi hợp đồng xác minh"/);
  const model = read('src/lib/channel-sales.ts');
  const payload = model.slice(model.indexOf('export type ReportContractInput ='), model.indexOf('export type RevenueReceiptInput ='));
  assert.doesNotMatch(payload, /contract_code:/);
});

test('Simplified Sales contract report computes total from fees and keeps required upload', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  const start = source.indexOf('function ContractDialog({');
  const end = source.indexOf('function ReceiptDialog({', start);
  assert.ok(start >= 0 && end > start);
  const form = source.slice(start,end);
  assert.match(form, /Tổng giá trị hợp đồng<\/strong>/);
  assert.doesNotMatch(form, /Tổng giá trị hợp đồng dự kiến/);
  assert.doesNotMatch(form, /Ví dụ minh họa: phí duy trì/);
  assert.match(form, /maintenance_fee: maintenance/);
  assert.match(form, /setup_fee: setup/);
  assert.match(form, /maintenance \* multiplier \+ setup/);
  assert.match(form, /name="contract_file"/);
  assert.match(form, /name="contract_note"/);
  assert.doesNotMatch(form, /Số đợt thanh toán theo hợp đồng|name="total_value"/);
});

test('Sales contract branch count is editable and persisted separately from chosen units', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  const start = source.indexOf('function ContractDialog({');
  const end = source.indexOf('function ReceiptDialog({', start);
  const form = source.slice(start, end);
  assert.match(form, /aria-label="Số phân hiệu triển khai" type="number"/);
  assert.doesNotMatch(form, /value=\{selectedUnitIds\.length\} readOnly/);
  assert.match(form, /branch_count: Number\(branchCount\)/);
  assert.match(form, /<AppCurrencyInput aria-label="Phí duy trì"/);
  assert.match(form, /<AppCurrencyInput aria-label="Phí khởi tạo"/);
  assert.match(form, /maintenance_fee: maintenance/);
  assert.match(form, /setup_fee: setup/);
  assert.match(form, /Tổng giá trị hợp đồng/);
});

test('Shared currency input never reformats while editing and formats VND on blur', () => {
  const source = read('src/components/common/inputs/app-currency-input.tsx');
  assert.match(source, /value=\{focused \? value : formatted\}/);
  assert.match(source, /setFocused\(true\)/);
  assert.match(source, /setFocused\(false\)/);
  assert.match(source, /inputMode="numeric"/);
  assert.match(source, /onValueChange\(digits\.replace/);
  assert.match(source, /15\)/);
  assert.doesNotMatch(source, /pendingCaretDigits/);
});

test('Sales contract revisions use original contract and retain manager instructions', () => {
  const source = read('src/components/roles/SalesContractRevisions.tsx');
  const sales = read('src/components/crm/channel-sales-view.tsx');
  assert.match(source, /school-contracts\/my-revisions/);
  assert.match(source, /school-contracts\/\$\{revision\.id\}\/resubmit/);
  assert.match(source, /revision\.reason/);
  assert.match(source, /maintenance_fee: Number\(maintenance\)/);
  assert.match(source, /contract_note: note/);
  assert.match(source, /id="sales-contract-revisions"/);
  assert.match(sales, /status === 'NEEDS_REVISION'/);
  assert.match(sales, /Bổ sung hồ sơ/);
  assert.match(sales, /status === 'MANAGER_REVIEWED'/);
  assert.match(sales, /status === 'PENDING_KIDSFIT'/);
});

test('Sales contract errors appear only in shared toast and duplicate report opening is guarded', () => {
  const source = read('src/components/crm/channel-sales-view.tsx');
  const contractStart = source.indexOf('function ContractDialog({');
  const contractEnd = source.indexOf('function ReceiptDialog({', contractStart);
  assert.ok(contractStart >= 0 && contractEnd > contractStart);
  const contract = source.slice(contractStart, contractEnd);
  assert.match(contract, /appNotice\.error\('Không thể gửi hợp đồng xác minh\.'/);
  assert.doesNotMatch(contract, /setError\(message\)/);
  assert.match(contract, /<DialogFooter saving=\{saving\} error="" onClose=\{onClose\} label="Gửi hợp đồng xác minh"\/>/);
  assert.match(contract, /latest\.contracts\.length > 0/);
  assert.match(source, /const openContractReport = async/);
  assert.match(source, /profile\.contracts\.length > 0/);
  assert.match(source, /onContract=\{\(\) => \{ void openContractReport\(customer\); \}\}/);
  assert.match(source, /customer\.can_manage_approach && !customer\.contract_id/);
});
