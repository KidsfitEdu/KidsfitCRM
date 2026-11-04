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
});
