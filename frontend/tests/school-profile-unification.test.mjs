import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('shared school profile renders main school once and branch-only list', () => {
  const profile = read('components/crm/schools/school-profile-details.tsx');
  assert.match(profile, /export function SchoolMainInfo/);
  assert.match(profile, /export function SchoolBranchDetails/);
  assert.match(profile, /units\.find\(unit => unit\.unit_type === 'MAIN'\)/);
  assert.match(profile, /units\.filter\(unit => unit\.unit_type === 'BRANCH'\)/);
  assert.match(profile, /<SchoolMainInfo unit=\{main\}\/>/);
  assert.match(profile, /<SchoolBranchDetails units=\{units\}\/>/);
  assert.match(profile, /Trường chưa có phân hiệu/);
  assert.match(profile, /Chưa có thông tin trường chính trong phạm vi hồ sơ/);
  assert.doesNotMatch(profile, /Trường điểm|trường điểm/);
});

test('Admin directory reuses the same detail body and does not repeat main campus', () => {
  const directory = read('components/crm/school-directory.tsx');
  assert.match(directory, /title="Thông tin trường học"/);
  assert.match(directory, /<SchoolDetail data=\{detail\.data\}/);
  assert.match(directory, /<SchoolProfileDetails units=\{data\.units\} schoolCode=\{data\.school_code\} statusLabel=\{statusLabel\}/);
  assert.match(directory, /title="Chỉnh sửa trường chính hoặc phân hiệu"/);
  assert.doesNotMatch(directory, /Sửa thông tin trường\/phân hiệu/);
});

test('Sales and reviewers share profile while keeping their workflow detail fields', () => {
  const sales = read('components/crm/school-operations.tsx');
  const manager = read('components/roles/ManagerWorklists.tsx');
  const admin = read('screens/Admin/Proposals/ProposalsPage.tsx');
  for (const source of [sales, manager, admin]) assert.match(source, /<SchoolProfileDetails units=/);
  assert.match(sales, /Thông tin đề xuất/);
  assert.match(manager, /Thông tin xử lý đề xuất/);
  assert.match(admin, /Người đề xuất/);
  assert.doesNotMatch(manager, /Chưa có thông tin trường chính liên kết/);
});

test('branch editor labels are consistent without changing MAIN and BRANCH API codes', () => {
  const editor = read('components/crm/schools/school-units-editor.tsx');
  assert.match(editor, /unit\.unit_type==='BRANCH' \? 'Tên phân hiệu' : field\.label/);
  assert.match(editor, /Danh sách phân hiệu/);
  assert.match(editor, /Thêm phân hiệu/);
  assert.match(editor, /unit_type==='BRANCH'/);
  assert.doesNotMatch(editor, /Trường điểm|trường điểm/);
});
