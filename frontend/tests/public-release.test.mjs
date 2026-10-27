import assert from 'node:assert/strict';
import test from 'node:test';
import { publicReleaseRedirect } from '../lib/public-release.ts';

const oldVersion = 'a'.repeat(40);
const newVersion = 'b'.repeat(40);
const origin = 'https://kidsfitedu.github.io';
const currentUrl = origin + '/KidsfitCRM/?filter=own#customers';
const manifestUrl = origin + '/KidsfitCRM/version.json';
const check = (overrides = {}) =>
  publicReleaseRedirect({
    currentUrl,
    manifestUrl,
    currentVersion: oldVersion,
    ...overrides,
  });
const reply = (version) => async () => ({
  ok: true,
  json: async () => ({ version }),
});

test('current release validates a fresh same-origin manifest without redirecting', async () => {
  let options;
  assert.equal(
    await check({
      fetchRelease: async (url, init) => {
        const target = new URL(url);
        assert.equal(target.origin, origin);
        assert.equal(target.pathname, '/KidsfitCRM/version.json');
        assert.match(target.searchParams.get('_fresh'), /^\d+$/);
        options = init;
        return { ok: true, json: async () => ({ version: oldVersion }) };
      },
    }),
    null,
  );
  assert.equal(options.cache, 'no-store');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal instanceof AbortSignal);
});

test('outdated release gets a new document URL while preserving location and filters', async () => {
  const redirect = new URL(await check({ fetchRelease: reply(newVersion) }));
  assert.equal(redirect.origin, origin);
  assert.equal(redirect.pathname, '/KidsfitCRM/');
  assert.equal(redirect.searchParams.get('_release'), newVersion);
  assert.equal(redirect.searchParams.get('filter'), 'own');
  assert.equal(redirect.hash, '#customers');
});

test('inconsistent CDN propagation cannot cause an infinite reload loop', async () => {
  const alreadyRetried = origin + '/KidsfitCRM/?_release=' + newVersion;
  assert.equal(
    await check({
      currentUrl: alreadyRetried,
      fetchRelease: reply(newVersion),
    }),
    null,
  );
});

test('offline, HTTP errors and malformed manifests keep the app available', async () => {
  assert.equal(
    await check({
      fetchRelease: async () => {
        throw new Error('offline');
      },
    }),
    null,
  );
  assert.equal(
    await check({
      fetchRelease: async () => ({
        ok: false,
        json: async () => ({ version: newVersion }),
      }),
    }),
    null,
  );
  for (const payload of [
    null,
    [],
    {},
    { version: 123 },
    { version: 'https://untrusted.example' },
  ]) {
    assert.equal(
      await check({
        fetchRelease: async () => ({ ok: true, json: async () => payload }),
      }),
      null,
    );
  }
});

test('development builds and external manifest URLs never make a release request', async () => {
  const fetchRelease = async () => {
    throw new Error('must not be called');
  };
  assert.equal(
    await check({ currentVersion: 'development', fetchRelease }),
    null,
  );
  assert.equal(
    await check({
      manifestUrl: 'https://external.example/version.json',
      fetchRelease,
    }),
    null,
  );
});
