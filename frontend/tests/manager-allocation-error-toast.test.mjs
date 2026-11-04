import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = p => readFileSync(resolve(import.meta.dirname, '..', 'src', p), 'utf8');

test('Allocation uses toast for business/API failures only', () => {
  const manager = read('components/roles/ManagerWorklists.tsx');
  const invite = manager.slice(manager.indexOf('const invite ='), manager.indexOf('const records = operations.data'));
  assert.match(invite, /path: '\/school-invitations'/);
  assert.match(invite, /apiErrorDisplay: 'toast'/);
  const otherActions = manager.slice(manager.indexOf('const decide ='), manager.indexOf('const invite ='));
  assert.doesNotMatch(otherActions, /apiErrorDisplay: 'toast'/);
});

test('School action form retains field validation and value on failed request', () => {
  const form = read('components/crm/schools/school-action-form.tsx');
  assert.match(form, /form\.formState\.errors\[field\.name\]/);
  assert.match(form, /action\.apiErrorDisplay === 'toast'/);
  assert.match(form, /appNotice\.error\('Không thể phân bổ trường', message\)/);
  assert.match(form, /setError\(message\)/);
  assert.doesNotMatch(form, /form\.reset\(/);
});
