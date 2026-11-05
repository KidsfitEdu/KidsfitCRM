import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = file => readFileSync(resolve(import.meta.dirname, '..', file), 'utf8');

test('Accounting and manager read granted protection from active CONTRACT ownership records', () => {
  const accounting = read('../backend/src/KidsfitCRM.Api/Features/AccountingContractEndpoints.cs');
  const manager = read('../backend/src/KidsfitCRM.Api/Features/ManagerContractEndpoints.cs');
  for (const source of [accounting, manager]) {
    assert.match(source, /protection_until = /);
    assert.match(source, /p\.SourceType == "CONTRACT" && p\.Status == "ACTIVE"/);
    assert.match(source, /p\.EffectiveUntil/);
  }
});

test('Accounting and manager UI distinguish granted protection from unknown service expiry', () => {
  const accounting = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  const manager = read('src/screens/SalesManager/Contracts/ContractsPage.tsx');
  for (const screen of [accounting, manager]) {
    assert.match(screen, /protection_until/);
    assert.match(screen, /Chưa quản lý riêng/);
    assert.match(screen, /5 năm/);
  }
  assert.match(accounting, /Chưa ghi nhận cấp quyền bảo vệ/);
  assert.match(manager, /Chưa ghi nhận cấp quyền/);
});

test('No fabricated service expiry or automatic grant is introduced', () => {
  const accounting = read('../backend/src/KidsfitCRM.Api/Features/AccountingContractEndpoints.cs');
  const manager = read('../backend/src/KidsfitCRM.Api/Features/ManagerContractEndpoints.cs');
  assert.doesNotMatch(accounting, /SignedOn\.AddYears\(1\)|EffectiveOn\.Value\.AddYears\(1\)/);
  assert.doesNotMatch(manager, /SignedOn\.AddYears\(1\)|EffectiveOn\.Value\.AddYears\(1\)/);
});
