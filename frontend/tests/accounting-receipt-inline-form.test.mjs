import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
const api=readFileSync(resolve(import.meta.dirname,'../../backend/src/KidsfitCRM.Api/Features/AccountingWorkspaceEndpoints.cs'),'utf8');
test('Receipt entry remains in one branded dialog with an inline school search',()=>{
  assert.ok(page.includes('id="receivable-contract-search"'));
  assert.ok(page.includes('id="receivable-contract-options"'));
  assert.ok(page.includes('receivableChoice'));
  assert.ok(page.includes('receivablePickerOpen'));
  assert.ok(page.includes("setSelected(item.id)"));
  assert.ok(page.includes("entryMode==='receipt'&&detail?.data.id===selected&&financialTransactionForm"));
  assert.ok(page.includes('Ghi nhận khoản thu'));
  assert.doesNotMatch(page,/max-h-72 space-y-2 overflow-y-auto/);
});
test('Selected contract reveals assigned Sales and manager without inventing either',()=>{
  assert.ok(page.includes('receivableChoice.owner_name'));
  assert.ok(page.includes('receivableChoice.manager_name'));
  assert.ok(page.includes("'Chưa xác định'"));
  assert.ok(api.includes('manager_name = (from membership in db.OrganizationMemberships'));
  assert.ok(api.includes('membership.ManagerUserId'));
  assert.ok(api.includes('access.Contracts(db).AsNoTracking()'));
});
test('Receipt submission retains idempotency and proof validation',()=>{
  assert.ok(page.includes("receiptAttempt.current={"));
  assert.ok(page.includes("'/evidence'"));
  assert.ok(page.includes('revenue_schedule_id:scheduleId'));
  assert.ok(page.includes("entryMode==='receipt'&&detail?.data.id===selected&&financialTransactionForm"));
  assert.ok(page.includes("if (Object.keys(validation).length)"));
});
