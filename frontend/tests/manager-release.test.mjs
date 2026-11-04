import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('Manager team actions have spacing and use release terminology', () => {
  const page = read('screens/SalesManager/Team/TeamPage.tsx');
  assert.match(page, /flex items-center justify-center gap-3 whitespace-nowrap/);
  assert.match(page, /icon=\{ShieldMinus\}/);
  assert.match(page, /Thu hồi quyền tiếp cận/);
  assert.doesNotMatch(page, /Bàn giao khi nghỉ việc|UserRoundX/);
});

test('Release drawer never suspends Sales and does not ask for handover summary', () => {
  const drawer = read('screens/SalesManager/Team/SalesHandoverDrawer.tsx');
  assert.match(drawer, /\/school-approach-releases\//);
  assert.match(drawer, /Lý do thu hồi quyền tiếp cận/);
  assert.match(drawer, /Xác nhận thu hồi/);
  assert.doesNotMatch(drawer, /suspend_account|resign-summary|Liên hệ, lịch hẹn và cam kết còn lại/);
  assert.doesNotMatch(drawer, /Bàn giao và ngưng|ngưng quyền của nhân sự/);
  assert.match(drawer, /pending_invitations/);
  assert.match(drawer, /pending_extensions/);
});
