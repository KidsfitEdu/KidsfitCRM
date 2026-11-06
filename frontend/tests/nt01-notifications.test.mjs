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
  assert.match(header, /expiryNotifications\.data\?\.data\.map/);
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
