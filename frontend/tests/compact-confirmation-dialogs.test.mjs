import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../src/'+path, import.meta.url), 'utf8');

test('shared KIDSFIT dialogs provide a scoped compact variant', () => {
  const dialog=read('components/common/dialogs/app-dialog.tsx');
  const form=read('components/common/dialogs/app-form-dialog.tsx');
  const confirm=read('components/common/dialogs/confirm-dialog.tsx');
  assert.match(dialog, /compact\?: boolean/);
  assert.match(dialog, /compact && 'sm:max-w-\[480px\]'/);
  assert.match(dialog, /max-h-\[min\(92dvh,800px\)\]/);
  assert.match(dialog, /if \(!busy\) onOpenChange\(next\)/);
  assert.match(form, /compact=\{compact\}/);
  assert.match(confirm, /sm:max-w-md/);
});

test('single-reason approvals and rejections reuse compact CRM dialogs', () => {
  const proposal=read('screens/Admin/Proposals/ProposalsPage.tsx');
  const checkee=read('screens/Checkee/Verification/VerificationPage.tsx');
  const accounting=read('screens/Accounting/Contracts/AccountingContractsPage.tsx');
  const action=read('components/crm/schools/school-action-dialog.tsx');
  const renewal=read('components/crm/ProtectionRenewalPanel.tsx');
  assert.match(proposal, /busy=\{decisionBusy\} compact/);
  assert.match(proposal, /maxLength=\{4000\}/);
  assert.match(checkee, /title="Yêu cầu bổ sung hồ sơ".*compact footerAlign="center"/);
  assert.match(accounting, /busy=\{saving\} compact footerAlign="center"/);
  assert.match(accounting, /maxLength=\{1000\}/);
  assert.match(action, /action\?\.fields\.length === 1/);
  assert.match(renewal, /<AppDialog open=\{activeDecision\?\.action==='reject'/);
  assert.match(renewal, /compact footerAlign="center" busy=\{busy\}/);
});

test('simple school decisions use standard confirmations while preserving busy and error', () => {
  const draft=read('components/crm/school-operations.tsx');
  const directory=read('components/crm/school-directory.tsx');
  assert.match(draft, /<ConfirmDialog open=\{draftDecision !== null\}/);
  assert.match(draft, /draftError&&<p role="alert"/);
  assert.match(directory, /<ConfirmDialog open=\{archiveTarget !== null\}/);
  assert.match(directory, /destructive=\{!archiveTarget\?\.is_deleted\}/);
  assert.match(directory, /adminError&&<p role="alert"/);
});
