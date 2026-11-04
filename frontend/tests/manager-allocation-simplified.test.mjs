import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(import.meta.dirname, '../src/components/roles/ManagerWorklists.tsx'),'utf8');
const invitation = source.slice(source.indexOf('const invite ='), source.indexOf('const records = operations.data'));

test('manager invitation form has only school, Sales/CTV and reason', () => {
  assert.match(invitation, /name: 'school_id'/);
  assert.match(invitation, /name: 'assignee_user_id'/);
  assert.match(invitation, /label: 'Lý do'/);
  assert.doesNotMatch(invitation, /name: 'organization_id'/);
  assert.doesNotMatch(invitation, /name: 'respond_by'/);
  assert.doesNotMatch(invitation, /Lý do \/ căn cứ quyết định/);
  assert.match(invitation, /Vui lòng nhập lý do phân bổ trường\./);
});
