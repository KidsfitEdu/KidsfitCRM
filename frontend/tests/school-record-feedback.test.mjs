import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('Admin school form separates input validation from server notifications', () => {
  const editor = read('components/crm/schools/school-record-editor.tsx');
  assert.match(editor, /setErrors\(next\)/);
  assert.match(editor, /cause instanceof ChannelRequestError && cause.status === 422/);
  assert.match(editor, /appNotice\.error\('Không thể lưu hồ sơ trường học\.'/);
  assert.doesNotMatch(editor, /setError\(/);
  assert.doesNotMatch(editor, /\{error&&<p/);
  assert.match(editor, /cause.status === 404 \|\| cause.status === 405/);
});

test('Admin directory hides school codes while preserving data bindings', () => {
  const source = read('components/crm/school-directory.tsx');
  assert.match(source, /!adminMode && <p/);
  assert.match(source, /description=\{adminMode \?/);
  const editor = read('components/crm/schools/school-record-editor.tsx');
  assert.match(editor, /body:JSON\.stringify\(\{units\}\)/);
  assert.doesNotMatch(editor, /official-school-code|Mã trường chính/);
});

test('Transport preserves structured API validation errors', () => {
  const transport = read('lib/channel-operations.ts');
  assert.match(transport, /readonly errors: Record<string, string\[\]>/);
  assert.match(transport, /requestErrorMessage\(response.status/);
  assert.match(transport, /response.status,\s*errors/);
});

test('Shared school fields keep per-input feedback for both Admin and Sales', () => {
  const shared = read('components/crm/schools/school-units-editor.tsx');
  assert.match(shared, /aria-invalid=\{!!errors/);
  assert.match(shared, /errors\[\x60\$\{index\}\.\$\{field.key\}\x60\]/);
  const sales = read('components/crm/schools/school-proposal-editor.tsx');
  assert.match(sales, /<SchoolBranchList/);
  assert.match(sales, /<SchoolUnitFields/);
  const adminDirectory = read('components/crm/schools/school-record-editor.tsx');
  const adminProposal = read('components/crm/schools/admin-proposal-profile-editor.tsx');
  assert.match(adminDirectory, /<SchoolMainSection/);
  assert.match(adminProposal, /<SchoolMainSection/);
  assert.doesNotMatch(adminDirectory, /official-school-code|Mã trường chính/);
  assert.doesNotMatch(adminDirectory, /school_code:code/);
  assert.doesNotMatch(adminProposal, /Mã trường chính|school_code/);
  assert.match(shared, /label: 'Tên trường'/);
  assert.doesNotMatch(shared, /Tên trường\/phân hiệu/);
});

test('Sales approach registration produces one success toast after synchronization', () => {
  const directory = read('components/crm/school-directory.tsx');
  assert.match(directory, /command\.path === '\/approach-registrations'/);
  assert.match(directory, /appNotice\.success\('Đăng ký tiếp cận thành công\.'/);
  assert.equal((directory.match(/appNotice\.success\('Đăng ký tiếp cận thành công\.'/g) ?? []).length, 1);
  assert.match(directory, /await syncAfterSave\(\);\s*if \(command\.path === '\/approach-registrations'\)/);
  assert.match(directory, /\}\)\.then\(\(\) => \{\s*setRegisterSchool\(null\);\s*\}\)\.catch/);
  assert.match(directory, /else if \(adminMode\) \{\s*appNotice\.success/);
});
