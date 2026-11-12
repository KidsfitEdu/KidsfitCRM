import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path) => readFileSync(resolve(import.meta.dirname,'../src/',path),'utf8');
const board = read('screens/Board/BoardCommissionPoliciesPanel.tsx');
const dialog = read('screens/Board/BoardCommissionPolicyEditorDialog.tsx');
const manager = read('screens/SalesManager/Team/ManagerCommissionPanel.tsx');
const tabs = read('screens/Board/Policies/PoliciesPage.tsx');

test('board policy uses shared CRM table, toolbar, pagination and icon actions',()=>{
  for(const part of ['AdminListPanel','AdminListToolbar','AppPagination','AdminIconAction','AdminStatusBadge'])
    assert.match(board,new RegExp(part));
  assert.match(board,/BoardCommissionPolicyEditorDialog/);
  assert.match(tabs,/AppPageHeader/);
  assert.match(tabs,/border-b-2/);
});

test('commission dialog is immediately applied without reason or effective date inputs',()=>{
  assert.match(dialog,/AppDialog/);
  assert.match(dialog,/AppNativeSelect/);
  assert.match(dialog,/Lưu &amp; áp dụng/);
  assert.match(dialog,/managerCeilingPercent/);
  assert.doesNotMatch(dialog,/(<label[^>]*>Ngày hiệu lực|<label[^>]*>Lý do cấu hình|effectiveFrom:|reason:)/);
  assert.doesNotMatch(board,/effectiveFrom:form/);
});

test('manager allocation supports partial splits, scoped ceiling and history',()=>{
  assert.match(manager,/AppDialog/);
  assert.match(manager,/AdminIconAction/);
  assert.match(manager,/AppPagination/);
  assert.match(manager,/a\+b>\(selected.ceilingPercent\?\?0\)/);
  assert.match(manager,/b>\(selected.managerCeilingPercent\?\?0\)/);
  assert.match(manager,/historyFor/);
  assert.doesNotMatch(manager,/(effectiveFrom:date|reason,)/);
});

test('BGĐ and manager forms do not directly change financial ledger',()=>{
  assert.doesNotMatch(board,/commission-ledger|payouts|CreatePayout/);
  assert.doesNotMatch(manager,/commission-ledger|payouts|CreatePayout/);
});
