import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('unified bell fetches one backend inbox with three filters and one read endpoint', () => {
  const header = read('src/components/layout/Header.tsx');
  assert.ok(header.includes('request<WorkflowNotificationsResponse>(`/notifications?page=${pageParam}`, token)'));
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

test('notification bell matches compact reference and fetches actual next pages', () => {
  const header = read('src/components/layout/Header.tsx');
  const required = [
    'w-[min(92vw,320px)]',
    'max-h-[min(48dvh,300px)]',
    'useInfiniteQuery({',
    'initialPageParam: 1',
    '/notifications?page=${pageParam}',
    'getNextPageParam:',
    'lastPage.data.length === NOTIFICATION_PAGE_SIZE',
    'pages.flatMap(page => page.data)',
    'workflowNotifications.hasNextPage',
    'workflowNotifications.fetchNextPage()',
    'workflowNotifications.isFetchingNextPage',
    'Tải thêm',
    'aria-pressed={noticeFilter === filter}',
    'line-clamp-2 break-words',
    'notificationTime(notice.createdAt)',
  ];
  for (const expected of required) assert.ok(header.includes(expected), expected);
  assert.ok(!header.includes('notificationIcon('));
});
