import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('NT-01 keeps proposal notifications separate from verified-contract expiry alerts', () => {
  const header = read('src/components/layout/Header.tsx');
  assert.match(header, /\/notifications\/contract-expiry/);
  assert.match(header, /\/notifications\/contract-expiry\/.*\/read/);
  assert.match(header, /\/notifications\/.*\/read/);
  assert.match(header, /expiryNotifications\.data\?\.unread_count/);
  assert.doesNotMatch(header, /expiryNotifications\\.data/);
  assert.match(header, /onNavigate\?\.\(notice\.target\)/);
});

test('NT-01 backend separates service and Sales rights milestone notifications', () => {
  const service = read('../backend/src/KidsfitCRM.Api/Infrastructure/ContractExpiryAlertService.cs');
  assert.match(service, /ServiceOffsets = \[30, 15, 7, 0, -30\]/);
  assert.match(service, /ProtectionOffsets = \[30, 7, 0\]/);
  assert.match(service, /Asia\/Ho_Chi_Minh/);
  assert.match(service, /INSERT IGNORE INTO contract_expiry_alerts/);
  assert.match(service, /x\.Status == "CONFIRMED"/);
  assert.match(service, /p\.SourceType == "CONTRACT"/);
  const endpoint = read('../backend/src/KidsfitCRM.Api/Features/SchoolProposalAlertEndpoints.cs');
  assert.match(endpoint, /visibleContracts\.Contains\(x\.ContractId\)/);
  assert.match(endpoint, /x\.RecipientUserId == access\.UserId/);
});

test('unified bell keeps NT-01 and proposal notifications, sorts them and filters active tasks', () => {
  const header = read('src/components/layout/Header.tsx');
  assert.match(header, /noticeItems = \[/);
  assert.doesNotMatch(header, /expiryNotifications\\.data/);
  assert.doesNotMatch(header, /notifications\\.data/);
  assert.match(header, /workflowNotifications\.data\?\.data\.map/);
  assert.match(header, /sort\(\(a, b\) => new Date\(b\.createdAt\)/);
  assert.match(header, /noticeFilter === 'UNREAD'/);
  assert.match(header, /aria-pressed=\{noticeFilter === filter\}/);
  assert.match(header, /crm-notification-target/);
});
