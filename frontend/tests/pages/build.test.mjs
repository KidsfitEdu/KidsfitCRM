import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const output = fileURLToPath(new URL('../../dist-pages/', import.meta.url));
const base = '/KidsfitCRM/';

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      assert.equal(
        entry.isSymbolicLink(),
        false,
        'Static artifacts must not contain symlinks.',
      );
      return entry.isDirectory() ? filesIn(target) : [target];
    }),
  );
  return files.flat();
}

test('Pages HTML resolves every asset under the project subpath', async () => {
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /iSchool &amp; F&amp;B|iSchool & F&B/);
  assert.match(html, /<html lang="vi">/);
  assert.doesNotMatch(html, /demo/i);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(assets.some((asset) => asset.endsWith('.js')));
  assert.ok(assets.some((asset) => asset.endsWith('.css')));
  for (const asset of assets) {
    assert.ok(asset.startsWith(base), `Unexpected asset path: ${asset}`);
    const target = path.resolve(output, asset.slice(base.length));
    assert.ok(target.startsWith(output));
    await readFile(target);
  }
});

test('Pages output contains only static assets, never sources, private files or API configuration', async () => {
  const files = await filesIn(output);
  assert.ok(files.length >= 3);
  let javascript = '';
  for (const file of files) {
    assert.ok(
      /\.(?:html|js|css|svg|png|jpg|webp|ico|woff2?)$/.test(file) ||
        file === path.join(output, 'version.json'),
      `Unexpected artifact: ${file}`,
    );
    assert.doesNotMatch(
      file,
      /(?:\.env|\.map$|\.xlsx?$|\.pdf$|wrangler|hosting\.json|\.git)/i,
    );
    if (file.endsWith('.js')) javascript += await readFile(file, 'utf8');
  }
  assert.match(javascript, /admin@demo\.kidsfit\.example/);
  assert.match(javascript, /Demo@2026/);
  assert.doesNotMatch(javascript, /https?:\/\/(?:localhost|127\.0\.0\.1):8000/);
  assert.doesNotMatch(javascript, /sourceMappingURL=/);
  assert.doesNotMatch(javascript, /admin@kidsfit\.vn|Kidsfit@2026/);
  assert.doesNotMatch(javascript, /PAGES_SECRET_CANARY_DO_NOT_PUBLISH/);
  assert.doesNotMatch(
    javascript,
    /Học viên|Lớp học|Thu học phí|37 \/ 50 học viên/,
  );
  assert.doesNotMatch(javascript, /English Kids|Math Discovery|STEAM Explorer/);
});

test('Pages release manifest contains only the deployment version', async () => {
  const manifest = JSON.parse(
    await readFile(path.join(output, 'version.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(manifest), ['version']);
  assert.match(manifest.version, /^(?:[a-f0-9]{40}|development)$/);
  if (/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? '')) {
    assert.equal(manifest.version, process.env.GITHUB_SHA);
  }
});
