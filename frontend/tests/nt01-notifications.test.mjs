import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('unified bell fetches one backend inbox with three filters and one read endpoint', () => {
  const header = read('src/components/layout/Header.tsx');
  assert.match(header, /request<WorkflowNotificationsResponse>\('\/notifications', token\)/);
  assert.match(header, /'\/notifications\/' \+ notice\.id \+ '\/read'/);
  assert.doesNotMatch(header, /\/notifications\/contract-expiry|\/notifications\/workflow/);
  assert.match(header, /noticeFilter === 'UNREAD'/);
  assert.match(header, /aria-pressed=\{noticeFilter === filter\}/);
  assert.match(header, /crm-notification-target/);
});
test('NT-01 worker retains local milestones and writes to shared inbox', () => {
  const worker = read('../backend/src/KidsfitCRM.Api/Infrastructure/ContractExpiryAlertService.cs');
  assert.match(worker, /ServiceOffsets = \[30, 15, 7, 0, -30\]/);
  assert.match(worker, /ProtectionOffsets = \[30, 7, 0\]/);
  assert.match(worker, /Asia\/Ho_Chi_Minh/);
  assert.match(worker, /INSERT IGNORE INTO crm_notifications/);
  assert.doesNotMatch(worker, /INSERT IGNORE INTO contract_expiry_alerts/);
});
test('proposal overdue worker shares inbox without changing admin and director recipients', () => {
  const worker = read('../backend/src/KidsfitCRM.Api/Infrastructure/SchoolProposalAlertService.cs');
  assert.match(worker, /ADMIN_OVERDUE/);
  assert.match(worker, /DIRECTOR_ESCALATION/);
  assert.match(worker, /INSERT IGNORE INTO crm_notifications/);
});

test('notification popover stays compact, accessible and independently scrollable', () => {
  const header = read('src/components/layout/Header.tsx');
  assert.match(header, /w-\[min\(92vw,380px\)\]/);
  assert.match(header, /max-h-\[min\(55dvh,355px\)\]/);
  assert.match(header, /overflow-y-auto overscroll-contain/);
  assert.match(header, /line-clamp-2 break-words/);
  assert.match(header, /min-w-0 flex-1 truncate/);
  assert.match(header, /aria-pressed=\{noticeFilter === filter\}/);
  assert.match(header, /notificationIcon\(notice\.kind\)/);
  assert.match(header, /notice\.actionable/);
  assert.match(header, /notificationTime\(notice\.createdAt\)/);
  assert.doesNotMatch(header, /my-1 flex w-full gap-2 rounded-xl border p-3/);
});
