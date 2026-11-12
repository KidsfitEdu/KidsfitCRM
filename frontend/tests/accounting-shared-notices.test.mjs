import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');

test('Accounting shows server and operation failures using the shared notice, not in-drawer banners', () => {
  const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.match(ui, /import \{ appNotice \} from '@\/components\/common\/app-toast-provider'/);
  assert.match(ui, /appNotice\.error\('Không tải được danh sách hợp đồng\.'/);
  assert.match(ui, /appNotice\.error\('Không tải được chi tiết hợp đồng\.'/);
  assert.match(ui, /appNotice\.error\('Không mở được chứng từ\.'/);
  assert.match(ui, /appNotice\.error\('Không thể lưu giao dịch\.'/);
  assert.match(ui, /appNotice\.error\('Không tạo được phiếu chi\.'/);
  assert.match(ui, /appNotice\.error\('Không duyệt được phiếu chi\.'/);
  assert.match(ui, /appNotice\.success\(entryMode === 'receipt' \? 'Đã ghi nhận khoản thu\.'/);
  assert.doesNotMatch(ui, /actionError|setActionError|\{error && <p role="alert"/);
});

test('Accounting transaction validation stays beside the corresponding form fields', () => {
  const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.match(ui, /setFieldErrors\(validation\)/);
  assert.match(ui, /fieldErrors\.transaction_date/);
  assert.match(ui, /fieldErrors\.amount/);
  assert.match(ui, /fieldErrors\.proof/);
  assert.match(ui, /fieldErrors\.reference_code/);
  assert.match(ui, /fieldErrors\.schedule_id/);
  assert.match(ui, /fieldErrors\.payout_id/);
  assert.match(ui, /cause instanceof ChannelRequestError && cause\.status === 422/);
  assert.match(ui, /validateTransactionDay\(date, today, signedOn, entryMode\)/);
  const validator = read('src/lib/accounting-transaction-date.ts');
  assert.match(validator, /date < signedOn/);
  assert.match(ui, /aria-invalid=\{Boolean\(fieldErrors\.transaction_date\)\}/);
});

test('Accounting form suppresses browser validation and reports empty input errors inline in Vietnamese', () => {
  const ui = read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');
  assert.match(ui, /<form noValidate className="space-y-4"/);
  assert.match(ui, /if \(!reference\) validation\.reference_code = 'Vui lòng nhập mã giao dịch ngân hàng\.'/);
  assert.match(ui, /validateTransactionDay\(date, today, signedOn, entryMode\)/);
  assert.match(read('src/lib/accounting-transaction-date.ts'), /if \(!date\) return 'Vui lòng chọn ngày giao dịch\.'/);
  assert.match(ui, /if \(!Number\.isSafeInteger\(amount\) \|\| amount <= 0\) validation\.amount/);
  assert.match(ui, /if \(!\(proof instanceof File\) \|\| proof\.size === 0\) validation\.proof/);
  assert.match(ui, /fieldErrors\.amount && <p role="alert"/);
  assert.match(ui, /fieldErrors\.reference_code && <p role="alert"/);
  assert.match(ui, /fieldErrors\.proof && <p role="alert"/);
  assert.match(ui, /delete updated\[name\]/);
});

test('Accounting dashboard issues one shared error notice per failed fetch', () => {
  const ui = read('src/screens/Accounting/Dashboard/DashboardPage.tsx');
  assert.match(ui, /appNotice\.error\('Không tải được tổng quan Kế toán\.'/);
  assert.match(ui, /lastNotifiedErrorAt/);
  assert.doesNotMatch(ui, /\{finance\.error && <p role="alert"/);
});
