import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'frontend/dist-public-pages');
const reportDir = process.env.PAGES_REPORT_DIR || '/tmp/kidsfit-public-demo-verification';
const release = process.env.KIDSFIT_PAGES_RELEASE || 'bddb6aae02e935a9fcea431c699c59c4793d398e';
const local = !process.env.KIDSFIT_DEMO_URL;
const base = new URL(process.env.KIDSFIT_DEMO_URL || 'http://127.0.0.1:4186/KidsfitCRM/');
const fresh = new URL(base);
fresh.searchParams.set('_release', release);
let preview;
let browser;
const report = { release, url: fresh.href, started_at: new Date().toISOString(), passed: false, profiles: [] };
const delay = ms => new Promise(r => setTimeout(r, ms));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

try {
  await mkdir(reportDir, { recursive: true });
  if (local) {
    preview = spawn(process.execPath, [join(root, 'frontend/node_modules/vite/bin/vite.js'), 'preview', '--config', 'vite.pages.config.ts', '--outDir', output, '--host', '127.0.0.1', '--port', '4186', '--strictPort'], {
      cwd: join(root, 'frontend'), stdio: 'ignore',
    });
  }
  let html;
  for (let attempt = 0; attempt < (local ? 40 : 120); attempt++) {
    try {
      const probe = new URL(fresh);
      probe.searchParams.set('_fresh', String(Date.now()));
      const response = await fetch(probe, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      const text = await response.text();
      if (response.ok && text.includes(`name="kidsfit-release" content="${release}"`)) {
        html = text;
        report.http_status = response.status;
        report.cache_control = response.headers.get('cache-control');
        break;
      }
    } catch { /* Pages deployment can take time to propagate. */ }
    await delay(local ? 250 : 2000);
  }
  assert.ok(html, 'The requested release must be served before browser verification.');
  const manifestUrl = new URL('version.json', base);
  manifestUrl.searchParams.set('_fresh', String(Date.now()));
  const manifest = await fetch(manifestUrl, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  assert.ok(manifest.ok, 'A compatibility version manifest is required for older cached releases.');
  assert.deepEqual(await manifest.json(), { version: release });
  report.legacy_cache_refresh_manifest = true;
  const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
  report.assets = [];
  for (const asset of assetPaths) {
    assert.ok(asset.startsWith('/KidsfitCRM/'), 'Unexpected asset origin/path: ' + asset);
    const assetUrl = new URL(asset, base);
    const response = await fetch(assetUrl, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    assert.ok(response.ok, 'Missing published asset: ' + asset);
    const bytes = Buffer.from(await response.arrayBuffer());
    const expected = await readFile(join(output, asset.slice('/KidsfitCRM/'.length)));
    assert.equal(sha256(bytes), sha256(expected), 'Stale or mismatched published asset: ' + asset);
    report.assets.push({ path: asset, sha256: sha256(bytes) });
  }
  browser = await chromium.launch({ headless: true,
    ...(process.env.PAGES_BROWSER_EXECUTABLE ? { executablePath: process.env.PAGES_BROWSER_EXECUTABLE } : {}) });
  const profiles = [['admin',8],['board',4],['accountant',2],['manager',7],['care',3],['sales',5],['checkee',3],['partner',7],['ctv',5]];
  for (const [id, count] of profiles) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 595 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    const forbiddenRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (/^https?:/.test(url.protocol) && (url.origin !== base.origin || url.pathname.startsWith('/api/')))
        forbiddenRequests.push(url.origin + url.pathname);
    });
    await page.goto(fresh.href);
    await page.getByText('Chào mừng trở lại', { exact: true }).waitFor();
    assert.equal(await page.locator('meta[name="kidsfit-release"]').getAttribute('content'), release);
    if (id === 'admin') {
      assert.equal(await page.locator('input[name="email"]').inputValue(), 'admin@kidsfit.example');
      assert.equal(await page.locator('input[name="password"]').inputValue(), 'Demo@2026');
      await page.screenshot({ path: join(reportDir, 'login-desktop.png'), fullPage: true });
      await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click();
      assert.equal(await page.locator('input[name="password"]').getAttribute('type'), 'text');
      await page.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }).click();
      await page.locator('input[name="password"]').fill('invalid-public-demo-password');
      await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
      await page.getByText('Email hoặc mật khẩu không chính xác.', { exact: true }).waitFor();
    }
    await page.locator('input[name="email"]').fill(id + '@kidsfit.example');
    await page.locator('input[name="password"]').fill('Demo@2026');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    const navigation = page.getByRole('navigation', { name: 'Điều hướng chính', exact: true });
    await navigation.locator('button').first().waitFor();
    assert.equal(await navigation.locator('button').count(), count, id + ' navigation');
    await navigation.locator('button').last().click();
    await delay(250);
    if (id === 'admin') {
      await page.reload();
      await page.getByRole('navigation', { name: 'Điều hướng chính', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
      await page.getByText('Chào mừng trở lại', { exact: true }).waitFor();
    }
    assert.deepEqual(errors, [], id + ' browser exceptions');
    assert.deepEqual(forbiddenRequests, [], 'Public demo must not call an API or external service.');
    report.profiles.push({ id, navigation_count: count, passed: true });
    await context.close();
  }
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await mobile.newPage();
  await page.goto(fresh.href);
  await page.getByText('Chào mừng trở lại', { exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile login must not scroll horizontally.');
  await page.screenshot({ path: join(reportDir, 'login-mobile.png'), fullPage: true });
  await page.locator('input[name="email"]').fill('ctv@kidsfit.example');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('navigation', { name: 'Điều hướng di động', exact: true }).waitFor();
  await mobile.close();
  report.mobile_passed = true;
  report.passed = true;
  console.log('PASS: release SHA, asset checksums, new login, invalid password, 9 accounts, session restore, logout, mobile, no API calls.');
} catch (error) {
  report.error = error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  preview?.kill();
  report.finished_at = new Date().toISOString();
  await mkdir(reportDir, { recursive: true });
  await writeFile(join(reportDir, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
}
