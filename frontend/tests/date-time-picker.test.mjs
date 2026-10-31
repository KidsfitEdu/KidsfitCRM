import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseLocalDateTime, toLocalDateTime, formatLocalDateTime,
} from '../src/lib/date-time-picker.ts';
import { workflowFormValue, vietnamDateTimeInput } from '../src/lib/school-operations.ts';

test('compact picker preserves Vietnamese 24-hour wall clock and API UTC conversion', () => {
  const input = '2026-11-01T15:20';
  const parsed = parseLocalDateTime(input);
  assert.ok(parsed);
  assert.equal(parsed.hour, 15);
  assert.equal(parsed.minute, 20);
  assert.equal(toLocalDateTime(parsed.date, parsed.hour, parsed.minute), input);
  assert.equal(formatLocalDateTime(input), '01/11/2026 · 15:20');
  const utc = workflowFormValue('datetime-local', input);
  assert.equal(utc, '2026-11-01T08:20:00.000Z');
  assert.equal(vietnamDateTimeInput(utc), input);
});

test('picker accepts 00:00 and 23:59 without AM/PM', () => {
  for (const input of ['2026-01-01T00:00', '2026-12-31T23:59']) {
    const parsed = parseLocalDateTime(input);
    assert.ok(parsed);
    assert.equal(toLocalDateTime(parsed.date, parsed.hour, parsed.minute), input);
  }
});

test('picker rejects invalid calendar dates, hours and minute values', () => {
  for (const input of [
    '2026-02-30T09:00', '2026-11-31T09:00', '2026-00-01T10:00',
    '2026-13-01T10:00', '2026-10-01T24:00', '2026-10-01T10:60',
    '2026-10-01T9:05', 'not-a-date',
  ]) assert.equal(parseLocalDateTime(input), null, input);
  assert.throws(() => toLocalDateTime(new Date(2026, 9, 1), 24, 0));
  assert.throws(() => toLocalDateTime(new Date(2026, 9, 1), 9, 60));
});
