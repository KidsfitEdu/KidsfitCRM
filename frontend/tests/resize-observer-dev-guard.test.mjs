import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/resize-observer-dev-guard.js', import.meta.url), 'utf8');

function setup() {
  let listener;
  let now = 1000;
  runInNewContext(source, {
    window: { addEventListener(type, handler, capture) {
      assert.equal(type, 'error');
      assert.equal(capture, true);
      listener = handler;
    } },
    Date: { now: () => now },
  });
  return {
    advance(ms) { now += ms; },
    dispatch(message, error = null) {
      const result = { prevented: false, stopped: false };
      listener({ message, error,
        preventDefault() { result.prevented = true; },
        stopImmediatePropagation() { result.stopped = true; },
      });
      return result;
    },
  };
}

test('filters only transient ResizeObserver browser notifications', () => {
  const guard = setup();
  for (const message of [
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
  ]) {
    assert.deepEqual(guard.dispatch(message), { prevented: true, stopped: true });
  }
  assert.deepEqual(guard.dispatch('ResizeObserver loop completed with undelivered notifications.'),
    { prevented: false, stopped: false }, 'a sustained loop must remain visible');
  guard.advance(2001);
  assert.deepEqual(guard.dispatch('ResizeObserver loop completed with undelivered notifications.'),
    { prevented: true, stopped: true }, 'transient warning may recur later');
});

test('never masks actual JavaScript errors or unrelated messages', () => {
  const guard = setup();
  assert.deepEqual(guard.dispatch('TypeError: something failed'), { prevented: false, stopped: false });
  assert.deepEqual(guard.dispatch('ResizeObserver loop completed with undelivered notifications.', new Error('real error')),
    { prevented: false, stopped: false });
  assert.deepEqual(guard.dispatch('ResizeObserver loop completed with undelivered notifications. (other)'),
    { prevented: false, stopped: false });
});
