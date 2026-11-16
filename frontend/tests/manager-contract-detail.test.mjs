import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const managerScreen = readFileSync(resolve(root, 'src/screens/SalesManager/Contracts/ContractsPage.tsx'), 'utf8');

test('Manager contract drawer shows one most recent contract evidence', () => {
  assert.match(managerScreen, /detail\.evidence\[0\]/);
  assert.doesNotMatch(managerScreen, /detail\.evidence\.map\(/);
  assert.match(managerScreen, /Bản bổ sung gần nhất/);
  assert.match(managerScreen, /viewFile\(detail\.evidence\[0\]\)/);
  assert.match(managerScreen, /Chưa có file hợp đồng đính kèm/);
});

test('Manager contract drawer omits history panels without removing business actions', () => {
  assert.doesNotMatch(managerScreen, /detail\.audit_history/);
  assert.doesNotMatch(managerScreen, /detail\.history\.map\(/);
  assert.doesNotMatch(managerScreen, /Lịch sử chỉnh sửa hợp đồng/);
  assert.doesNotMatch(managerScreen, /Lịch sử xử lý/);
  assert.match(managerScreen, /Yêu cầu bổ sung/);
  assert.match(managerScreen, /Duyệt và gửi CHECKEE/);
  assert.match(managerScreen, /command\(confirm,'review'\)/);
  assert.match(managerScreen, /command\(revision,'request-revision'/);
});

test('Manager contract drawer follows shared card layout and Vietnamese labels', () => {
  assert.match(managerScreen, /title="Chi tiết hợp đồng"/);
  assert.match(managerScreen, /Thông tin hợp đồng/);
  assert.match(managerScreen, /Trường điểm \/ Phân hiệu triển khai/);
  assert.match(managerScreen, /Lịch thanh toán/);
  assert.match(managerScreen, /Trạng thái chưa xác định/);
  assert.match(managerScreen, /rounded-2xl border border-border bg-card/);
});
