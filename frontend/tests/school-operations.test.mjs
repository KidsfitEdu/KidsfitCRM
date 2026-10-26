import assert from 'node:assert/strict';
import test from 'node:test';
import {
  workflowFormValue,
  vietnamDateTimeInput,
} from '../lib/school-operations.ts';
import { schoolOperationsPreview } from '../lib/school-operations-preview.ts';
import { demoAccounts } from '../lib/demo-auth.ts';

test('workflow deadlines use Vietnam time independently of browser time zone', () => {
  assert.equal(
    workflowFormValue('datetime-local', '2026-10-26T14:30'),
    '2026-10-26T07:30:00.000Z',
  );
  assert.equal(
    vietnamDateTimeInput('2026-10-26T07:30:00.000Z'),
    '2026-10-26T14:30',
  );
  assert.equal(
    vietnamDateTimeInput('2026-10-26T20:30:00.000Z'),
    '2026-10-27T03:30',
  );
});
test('invalid dates, unsafe integers and ambiguous policy activation are rejected', () => {
  for (const value of ['2026-02-30T10:00', 'bad-date', '2026-10-26T25:30']) {
    assert.throws(() => workflowFormValue('datetime-local', value));
  }
  for (const value of ['9007199254740993', '1.5', 'NaN', '']) {
    assert.throws(() => workflowFormValue('number', value));
  }
  assert.equal(workflowFormValue('boolean', 'false'), false);
  assert.equal(workflowFormValue('boolean', 'true'), true);
  assert.throws(() => workflowFormValue('boolean', 'activate'));
  assert.equal(workflowFormValue('datetime-local', '', true), null);
  assert.equal(workflowFormValue('number', '750000'), 750000);
});
test('public workflow previews never offer mutations or use approved policy defaults', () => {
  function inspect(value) {
    if (Array.isArray(value)) return value.forEach(inspect);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith('can_')) assert.equal(child, false, key);
      inspect(child);
    }
  }
  for (const profile of demoAccounts) {
    const preview = schoolOperationsPreview(
      profile.abilities,
      new Date('2026-10-26T00:00:00Z'),
    );
    inspect(preview);
    assert.ok(preview.policies.every((policy) => policy.status === 'DRAFT'));
    assert.ok(
      preview.proposals.every(
        (proposal) =>
          proposal.contact_phone === null && proposal.email === null,
      ),
    );
  }
});
test('care and CHECKEE previews do not expose financial receipts or other teams', () => {
  for (const id of ['care', 'checkee']) {
    const profile = demoAccounts.find((profile) => profile.id === id);
    const preview = schoolOperationsPreview(profile.abilities);
    assert.deepEqual(preview.receipts, []);
    assert.deepEqual(preview.refunds, []);
    assert.deepEqual(preview.team, []);
  }
  const salesperson = schoolOperationsPreview(
    demoAccounts.find((profile) => profile.id === 'sales').abilities,
  );
  assert.deepEqual(salesperson.support_cases, []);
  assert.deepEqual(salesperson.team, []);
  assert.ok(
    demoAccounts
      .find((profile) => profile.id === 'board')
      .abilities.includes('channel_sales.school.escalation.resolve'),
  );
  assert.ok(
    !demoAccounts
      .find((profile) => profile.id === 'ctv')
      .abilities.includes('channel_sales.school.extension.review'),
  );
});
