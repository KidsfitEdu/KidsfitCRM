import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('Manager approval uses confirmation without any input or extra explanatory copy', () => {
  const source = read('components/roles/ManagerWorklists.tsx');
  assert.match(source, /title="Xác nhận duyệt gia hạn"/);
  assert.match(source, /confirmLabel="Xác nhận duyệt"/);
  assert.match(source, /approve: true, reason: null, approved_until: null, next_review_at: null/);
  assert.doesNotMatch(source, /Thời hạn được hiển thị để đối chiếu/);
  assert.doesNotMatch(source, /name:'approved_until'|name:'next_review_at'/);
});

test('Manager rejection uses only reason label and contextual validation', () => {
  const source = read('components/roles/ManagerWorklists.tsx');
  const field = read('components/crm/schools/school-action-form.tsx');
  assert.match(source, /label: 'Lý do', requiredMessage: 'Vui lòng nhập lý do từ chối gia hạn\.'/);
  assert.match(source, /onClick=\{\(\) => decide\('extension',e\.id,false\)\}/);
  assert.match(field, /field\.requiredMessage \?\?/);
});

test('manager workflow notice opens authorized request detail when loaded', () => {
  const source = read('components/roles/ManagerWorklists.tsx');
  assert.match(source, /crm-notification-target/);
  assert.match(source, /records\.extensions\.find\(x => x\.id === target\.entityId\)/);
  assert.match(source, /records\.proposals\.find\(x => x\.id === target\.entityId\)/);
  assert.match(source, /setSelection\(\{ kind: 'extension', item \}\)/);
});
