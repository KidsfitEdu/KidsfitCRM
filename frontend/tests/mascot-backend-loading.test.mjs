import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { ApiRequestError, createApiClient, isBackendUnavailable } from '../src/services/api.client.ts';

const source = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('Network and server errors are treated as unavailable; auth errors stay distinct', () => {
  assert.equal(isBackendUnavailable(new ApiRequestError('offline', 0, 'network')), true);
  assert.equal(isBackendUnavailable(new ApiRequestError('timeout', 0, 'timeout')), true);
  assert.equal(isBackendUnavailable(new ApiRequestError('server', 503, 'http')), true);
  assert.equal(isBackendUnavailable(new ApiRequestError('expired', 401, 'http')), false);
  assert.equal(isBackendUnavailable(new ApiRequestError('forbidden', 403, 'http')), false);
});

test('Transport retains HTTP status and preserves backend contract', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Phiên không hợp lệ' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
    await assert.rejects(createApiClient('http://localhost:5000')('/me', 'token'), error =>
      error instanceof ApiRequestError && error.status === 401 && error.kind === 'http');
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(createApiClient('http://localhost:5000')('/health'), error =>
      error instanceof ApiRequestError && error.kind === 'network');
  } finally { globalThis.fetch = originalFetch; }
});

test('Health check targets backend origin, not its /api prefix', async () => {
  const app = source('components/crm/crm-app.tsx');
  assert.match(app, /const healthRequest = createApiClient\(apiBase \? new URL\(apiBase\)\.origin : ''\)/);
  assert.match(app, /healthRequest\('\/health'\)/);
  assert.doesNotMatch(app, /request\('\/health'\)/);

  const originalFetch = globalThis.fetch;
  let requestedUrl = '';
  try {
    globalThis.fetch = async input => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ status: 'healthy' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    };
    const base = 'http://localhost:8000/api';
    await createApiClient(new URL(base).origin)('/health');
    assert.equal(requestedUrl, 'http://localhost:8000/health');
    await createApiClient(base)('/me', 'test-token');
    assert.equal(requestedUrl, 'http://localhost:8000/api/me');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Startup keeps existing session on network failure and only clears it on 401', () => {
  const app = source('components/crm/crm-app.tsx');
  assert.match(app, /cause instanceof ApiRequestError && cause.status === 401/);
  assert.match(app, /setSessionStatus\(isBackendUnavailable\(cause\) \? 'offline' : 'error'\)/);
  assert.match(app, /setRetryIndex\(index => index \+ 1\)/);
  assert.match(app, /healthRequest\('\/health'\)/);
  assert.match(app, /setHealthRetryIndex\(index => index \+ 1\)/);
  assert.match(app, /<PageLoading label=\{ready \? 'Đang xác thực tài khoản và tải dữ liệu\.\.\.'/);
  assert.match(app, /<Suspense fallback=\{<PageLoading/);
});

test('Login has retry and safe fallback to edit credentials', () => {
  const login = source('screens/Auth/Login/LoginPage.tsx');
  assert.match(login, /if \(isBackendUnavailable\(cause\)\)/);
  assert.match(login, /setConnectionIssue/);
  assert.match(login, /void attemptLogin\(\)/);
  assert.match(login, /Quay lại đăng nhập/);
  assert.match(login, /validateLogin\(email, password\)/);
});

test('Mascot is shared, has retry and respects reduced motion', () => {
  const mascot = source('components/common/mascot-loading-state.tsx');
  const styles = source('app/globals.css');
  assert.match(mascot, /function KidsfitOwl/);
  assert.match(mascot, /viewBox="0 0 180 146"/);
  assert.match(mascot, /w-\[112px\] sm:w-\[124px\]/);
  assert.match(mascot, /max-w-\[340px\]/);
  assert.match(mascot, /sleeping=\{!loading\}/);
  assert.match(mascot, /crm-owl-progress/);
  assert.match(mascot, /aria-label="Đang tải dữ liệu/);
  assert.match(mascot, /aria-live=/);
  assert.match(mascot, /role=\{loading \? 'status' : 'alert'\}/);
  assert.match(mascot, /Thử kết nối lại/);
  assert.match(styles, /@keyframes crm-owl-blink/);
  assert.match(styles, /@keyframes crm-owl-breathe/);
  assert.match(styles, /@keyframes crm-owl-progress/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
