import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiRequestError, createApiClient } from '../src/services/api.client.ts';
import { channelRequest, ChannelRequestError } from '../src/lib/channel-operations.ts';
import { getPendingAppRequests } from '../src/lib/loading-tracker.ts';

test('JSON body gets JSON content type; FormData keeps browser multipart boundary', async () => {
  const original = globalThis.fetch;
  const received = [];
  try {
    globalThis.fetch = async (_url, options) => {
      received.push(options);
      return new Response(JSON.stringify({ data: true }), { status: 200 });
    };
    await createApiClient('http://localhost/api')('/me', '', { method: 'POST', body: JSON.stringify({ hello: true }) });
    await createApiClient('http://localhost/api')('/me', '', { method: 'POST', body: new FormData() });
    await channelRequest('http://localhost/api', 'token', '/schools', { method: 'POST', body: new FormData() });
    assert.equal(received[0].headers.get('Content-Type'), 'application/json');
    assert.equal(received[1].headers.has('Content-Type'), false);
    assert.equal(received[2].headers.has('Content-Type'), false);
    assert.equal(received[2].headers.get('Authorization'), 'Bearer token');
    assert.equal(getPendingAppRequests(), 0);
  } finally { globalThis.fetch = original; }
});

test('both transports distinguish request cancellation from network failures', async () => {
  const original = globalThis.fetch;
  const caller = new AbortController();
  caller.abort();
  try {
    globalThis.fetch = (_url, options) => Promise.reject(options.signal.reason ?? new DOMException('Aborted', 'AbortError'));
    await assert.rejects(createApiClient('http://localhost/api')('/customers', undefined, { signal: caller.signal }), e => e.name === 'AbortError');
    await assert.rejects(channelRequest('http://localhost/api', 'token', '/customers', { signal: caller.signal }), e => e.name === 'AbortError');
    assert.equal(getPendingAppRequests(), 0);
    globalThis.fetch = async () => { throw new TypeError('offline'); };
    await assert.rejects(createApiClient('http://localhost/api')('/customers'), e => e instanceof ApiRequestError && e.kind === 'network');
    await assert.rejects(channelRequest('http://localhost/api', 'token', '/customers'), e => e instanceof ChannelRequestError && e.status === 0);
    assert.equal(getPendingAppRequests(), 0);
  } finally { globalThis.fetch = original; }
});

test('channel transport preserves HTTP error contract and field errors', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ errors: { reason: ['Cần nhập lý do.'] } }), { status: 422 });
    await assert.rejects(channelRequest('http://localhost/api', 'token', '/schools'), e =>
      e instanceof ChannelRequestError && e.status === 422 && e.errors.reason[0] === 'Cần nhập lý do.');
    assert.equal(getPendingAppRequests(), 0);
  } finally { globalThis.fetch = original; }
});

test('both transports abort long-running requests with distinct timeout messages', async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  try {
    // The request's own timeout uses the first scheduler callback; do not block the test for 30 seconds.
    globalThis.setTimeout = (callback, _delay, ...args) => originalSetTimeout(callback, 1, ...args);
    globalThis.fetch = (_url, options) => new Promise((_resolve, reject) =>
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    await assert.rejects(createApiClient('http://localhost/api')('/customers'), e =>
      e instanceof ApiRequestError && e.kind === 'timeout');
    await assert.rejects(channelRequest('http://localhost/api', 'token', '/customers'), e =>
      e instanceof ChannelRequestError && e.status === 0 && /quá lâu/.test(e.message));
    assert.equal(getPendingAppRequests(), 0);
  } finally { globalThis.fetch = originalFetch; globalThis.setTimeout = originalSetTimeout; }
});
