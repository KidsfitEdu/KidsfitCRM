import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('Shared toast upserts by operation id and separates high-priority errors', () => {
  const provider = source('components/common/app-toast-provider.tsx');
  assert.match(provider, /operation\(id: string, type: NoticeType/);
  assert.match(provider, /toast\.add\(\{ \.\.\.\(id \? \{ id \} : \{\}\)/);
  assert.match(provider, /priority: type === 'error' \? 'high' : 'low'/);
  assert.match(provider, /error: 0/);
});

test('Toast is below measured sticky header and status icon is vertically centered', () => {
  const header = source('components/layout/Header.tsx');
  const toast = source('components/ui/toast.tsx');
  assert.match(header, /ref=\{headerRef\}/);
  assert.match(header, /--crm-header-height/);
  assert.match(header, /window\.addEventListener\('resize', measure\)/);
  assert.match(toast, /top-\[calc\(var\(--crm-header-height,72px\)\+12px\)\]/);
  assert.match(toast, /self-center rounded-full/);
  assert.match(toast, /<ToastProvider toastManager=\{toastManager\} limit=\{2\}/);
  assert.match(toast, /--toast-offset-y/);
  assert.doesNotMatch(toast, /transition:transform[^']*,height_/);
  assert.doesNotMatch(toast, /data-behind:opacity-0/);
  assert.match(toast, /aria-label="Đóng thông báo"/);
});

test('Personnel notifications distinguish mutation result from refresh failure and duplicate email', () => {
  const page = source('screens/Admin/Personnel/PersonnelPage.tsx');
  assert.match(page, /const refreshed=await reload\(false\)/);
  assert.match(page, /await task\(\)/);
  assert.match(page, /if \(operationId === 'personnel-create'\)/);
  assert.match(page, /appNotice\.operation\(operationId,refreshed\?'success':'warning'/);
  assert.match(page, /Email này đã được sử dụng\. Vui lòng kiểm tra hoặc nhập email khác/);
  assert.match(page, /'personnel-create'\);/);
  assert.match(page, /Tài khoản đã được lưu nhưng danh sách chưa cập nhật/);
});
