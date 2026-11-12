import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPendingAppRequests, subscribeAppRequests, trackAppRequest } from '../src/lib/loading-tracker.ts';

test('shared request tracker counts overlapping requests and cleans up exactly once', () => {
  const changes = [];
  const unsubscribe = subscribeAppRequests(() => changes.push(getPendingAppRequests()));
  const finishA = trackAppRequest();
  const finishB = trackAppRequest();
  assert.equal(getPendingAppRequests(), 2);
  finishA();
  finishA();
  assert.equal(getPendingAppRequests(), 1);
  finishB();
  unsubscribe();
  assert.equal(getPendingAppRequests(), 0);
  assert.deepEqual(changes, [1, 2, 1, 0]);
});

test('CRM shell reserves the mascot for an offline connection', () => {
  const shell = readFileSync(new URL('../src/components/crm/crm-app.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(shell, /MascotLoadingState state="loading"/);
  assert.match(shell, /sessionStatus === 'offline'/);
  assert.match(shell, /PageLoading label="Đang chuẩn bị màn hình/);
});

test('global motion obeys reduced-motion preferences', () => {
  const styles = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  assert.match(styles, /\.crm-page-enter/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /\.crm-skeleton, \.crm-page-enter, \.crm-global-progress-bar/);
});
