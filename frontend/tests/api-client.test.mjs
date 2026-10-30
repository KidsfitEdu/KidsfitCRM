import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiClient } from '../lib/api/client.ts';

test('CRM API adapter preserves base URL, bearer header and JSON result', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://crm.example/api/me');
    assert.equal(options.headers.get('Authorization'), 'Bearer sample-token');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    assert.equal(options.headers.get('Accept'), 'application/json');
    return new Response(JSON.stringify({ user: { name: 'Tester' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const request = createApiClient('https://crm.example/api');
    assert.deepEqual(await request('/me', 'sample-token'), { user: { name: 'Tester' } });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('CRM API adapter preserves first server validation message', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    message: 'Lỗi mặc định',
    errors: { email: ['Email không hợp lệ.'] },
  }), { status: 422, headers: { 'Content-Type': 'application/json' } });
  try {
    await assert.rejects(
      () => createApiClient('https://crm.example/api')('/login', undefined, { method: 'POST', body: '{}' }),
      /Email không hợp lệ/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('CRM API adapter does not add an authorization header when no token is supplied', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.has('Authorization'), false);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  try {
    assert.deepEqual(await createApiClient('https://crm.example/api')('/login'), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
