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

test('notification bell matches the small reference layout and supports real pagination', () => {
  const header = read('src/components/layout/Header.tsx');
  assert.match(header, /w-\\[min\\(92vw,320px\\)\\]/);
  assert.match(header, /max-h-\\[min\\(48dvh,300px\\)\\]/);
  assert.match(header, /useInfiniteQuery\\(/);
  assert.match(header, /initialPageParam: 1/);
  assert.match(header, /\\/notifications\\?page=\\$\\{pageParam\\}/);
  assert.match(header, /getNextPageParam:/);
  assert.match(header, /lastPage\\.data\\.length === NOTIFICATION_PAGE_SIZE/);
  assert.match(header, /pages\\.flatMap\\(page => page\\.data\\)/);
  assert.match(header, /hasNextPage/);
  assert.match(header, /fetchNextPage\\(\\)/);
  assert.match(header, /isFetchingNextPage/);
  assert.match(header, /Tải thêm/);
  assert.match(header, /aria-pressed=\\{noticeFilter === filter\\}/);
  assert.match(header, /line-clamp-2 break-words/);
  assert.match(header, /notificationTime\\(notice\\.createdAt\\)/);
  assert.doesNotMatch(header, /notificationIcon\\(/);
});
