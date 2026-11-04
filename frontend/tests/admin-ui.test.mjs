import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const adminPages = [
  'Dashboard/DashboardPage.tsx',
  'Schools/SchoolsPage.tsx',
  'Proposals/ProposalsPage.tsx',
  'Personnel/PersonnelPage.tsx',
  'Capacities/CapacitiesPage.tsx',
  'Policies/PoliciesPage.tsx',
  'Reports/ReportsPage.tsx',
].map((path) => 'src/screens/Admin/' + path);

test('Admin page headers do not expose manual refresh buttons', () => {
  for (const path of adminPages) {
    const source = read(path);
    assert.doesNotMatch(source, />Làm mới<\/AppButton>/, path);
  }
  const proposals = read('src/screens/Admin/Proposals/ProposalsPage.tsx');
  const capacities = read('src/screens/Admin/Capacities/CapacitiesPage.tsx');
  assert.match(proposals, /useEffect\(\(\)=>\{void reload\(\);\},\[reload\]\)/);
  assert.match(capacities, /useEffect\(\(\)=>\{void reload\(\);\},\[reload\]\)/);
  assert.match(proposals, /onReset=/);
  assert.match(capacities, /onReset=/);
});

test('Admin proposals hide synthetic school codes but retain real codes and raw editing', () => {
  const source = read('src/screens/Admin/Proposals/ProposalsPage.tsx');
  assert.equal(source.split("!p.school_code.startsWith('SEED-SCH-')").length - 1, 2);
  assert.match(source, /school_code:editFields\.school_code/);
  assert.match(source, /editFields\.school_code/);
  assert.match(source, /workflowLabels\[p.status\]/);
  assert.match(source, /appNotice\.success\(approve\?/);
});

test('All Admin views report server errors through shared toast; form errors stay inline', () => {
  for (const path of adminPages) {
    const source = read(path);
    if (path.endsWith('Schools/SchoolsPage.tsx')) {
      assert.match(source, /<SchoolRecordEditor/);
      assert.match(read('src/components/crm/schools/school-record-editor.tsx'), /appNotice\.error/);
    } else assert.match(source, /appNotice\.error/, path);
  }
  const proposals = read('src/screens/Admin/Proposals/ProposalsPage.tsx');
  const schools = read('src/screens/Admin/Schools/SchoolsPage.tsx');
  const capacity = read('src/screens/Admin/Capacities/CapacitiesPage.tsx');
  assert.match(proposals, /<FormError>\{reasonError\}<\/FormError>/);
  assert.match(schools, /<SchoolRecordEditor/);
  const editor = read('src/components/crm/schools/school-record-editor.tsx');
  assert.match(editor, /setErrors\(next\)/);
  assert.doesNotMatch(editor, /setError\\(message\\)/);
  assert.doesNotMatch(editor, /\\{error&&<p/);
  assert.match(editor, /cause instanceof ChannelRequestError && cause.status === 422/);
  assert.match(editor, /appNotice\\.error\\('Không thể lưu hồ sơ trường học\\.'/);
  assert.match(capacity, /<FormError id="capacity-limit-error">/);
});

test('Shared school directory uses toast notifications for both Sales and Admin', () => {
  const source = read('src/components/crm/school-directory.tsx');
  assert.match(source, /appNotice\.success\('Đã lưu thay đổi và lịch sử xử lý\.'/);
  assert.match(source, /appNotice\.error\('Không lưu được thay đổi trường học\.'/);
  assert.doesNotMatch(source, /!adminMode && notice &&/);
  assert.match(source, /!adminMode && upload\.error &&/);
  assert.match(source, /preview\.warnings\.map/);
  assert.match(source, /setPreview\(result\)/);
});

test('Admin personnel separates account and membership states and reuses audited server operations', () => {
  const page = read('src/screens/Admin/Personnel/PersonnelPage.tsx');
  const service = read('src/services/personnel.service.ts');
  assert.match(page, /Đối tác \/ Tổ chức/);
  assert.match(page, /account_status/);
  assert.match(page, /can_edit/);
  assert.match(page, /<ConfirmDialog/);
  assert.match(page, /completeTeamHandover/);
  assert.match(page, /reactivateTeam/);
  assert.match(page, /role_code/);
  assert.match(service, /\/school-handovers\//);
  assert.match(service, /\/school-team\//);
  assert.match(service, /\/admin\/partners/);
  assert.doesNotMatch(service, /DELETE/);
});

test('Admin personnel shows one lock icon per member and minimal lock/unlock dialogs', () => {
  const page = read('src/screens/Admin/Personnel/PersonnelPage.tsx');
  const dialog = read('src/components/common/dialogs/confirm-dialog.tsx');
  assert.match(page, /<th className="px-5 py-4">Tổ chức<\/th>/);
  assert.match(page, /<th className="px-5 py-4">Vai trò<\/th>/);
  assert.match(page, /effectiveStatus\(p,management/);
  assert.doesNotMatch(page, /Khóa toàn tài khoản/);
  assert.doesNotMatch(page, /Nội dung bàn giao \*/);
  assert.doesNotMatch(page, /Chỉ tác động tư cách thành viên/);
  assert.match(page, /partnerStatusAction/);
  assert.match(page, /statusAction\?\.suspend&&/);
  assert.match(dialog, /description\?: ReactNode/);
});

test('Admin unlock confirmation has compact header and concise copy', () => {
  const page = read('src/screens/Admin/Personnel/PersonnelPage.tsx');
  const confirm = read('src/components/common/dialogs/confirm-dialog.tsx');
  const dialog = read('src/components/common/dialogs/app-dialog.tsx');
  assert.match(page, /compactHeader=\{!statusAction\?\.suspend\}/);
  assert.match(page, /compactHeader=\{!partnerStatusAction\?\.suspend\}/);
  assert.match(page, /Bạn có chắc chắn muốn mở khóa thành viên này không\?/);
  assert.match(page, /Bạn có chắc chắn muốn mở khóa tổ chức này không\?/);
  assert.match(page, /'Xác nhận'/);
  assert.match(confirm, /headerClassName=\{compactHeader/);
  assert.match(dialog, /headerClassName\?: string/);
});

test('Admin personnel and partner forms align native selects and place actions in dialog footers', () => {
  const page = read('src/screens/Admin/Personnel/PersonnelPage.tsx');
  const actions = read('src/components/common/form-actions.tsx');
  assert.match(page, /contentClassName="sm:max-w-md" title=\{partner/);
  assert.equal((page.match(/footer=\{<FormActions inDialogFooter/g) ?? []).length, 3);
  assert.match(page, /<label htmlFor="admin-new-org">Tổ chức \*/);
  assert.match(page, /<label htmlFor="admin-new-role">Vai trò \*/);
  assert.match(page, /<label htmlFor="admin-new-manager">Quản lý bán hàng trực tiếp \*/);
  assert.match(page, /<AppNativeSelect id="admin-new-org" containerClassName="w-full"/);
  assert.match(page, /<AppNativeSelect id="admin-new-role" containerClassName="w-full"/);
  assert.match(page, /grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2/);
  assert.match(page, /<label htmlFor="admin-partner-name">Tên đối tác \*/);
  assert.match(actions, /inDialogFooter \? "flex w-full items-center justify-end gap-2"/);
});

test('Personnel detail reuses the shared drawer and shows grouped profile without duplicate close button', () => {
  const page = read('src/screens/Admin/Personnel/PersonnelPage.tsx');
  const detail = read('src/screens/Admin/Personnel/PersonnelDetailDrawer.tsx');
  assert.match(page, /<PersonnelDetailDrawer person=\{detail\}/);
  assert.match(detail, /<AppDrawer/);
  assert.match(detail, /Thông tin cá nhân/);
  assert.match(detail, /Thông tin tổ chức & phân quyền/);
  assert.match(detail, /Trạng thái truy cập/);
  assert.match(detail, /effectiveLabel/);
  assert.match(detail, /hasManager &&/);
  assert.match(detail, /Chưa cập nhật/);
  assert.doesNotMatch(detail, /<AppButton[^>]*>Đóng<\/AppButton>/);
});
