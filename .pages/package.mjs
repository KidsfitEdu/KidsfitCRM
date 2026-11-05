import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const original = join(root, 'frontend/dist-pages');
const published = join(root, 'frontend/dist-public-pages');
const release = process.env.KIDSFIT_PAGES_RELEASE || 'bddb6aae02e935a9fcea431c699c59c4793d398e';
assert.match(release, /^[a-f0-9]{40}$/);

async function files(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    assert.equal(entry.isSymbolicLink(), false, 'Published artifacts must not contain symlinks.');
    const name = join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(join(dir, entry.name), name));
    else { assert.ok(entry.isFile()); result.push(name); }
  }
  return result.sort();
}
const originals = await files(original);
assert.ok(originals.length > 3);
assert.ok(!originals.includes('version.json'));
for (const path of originals) assert.match(path, /\.(?:html|js|css|svg|png|jpg|webp|ico|woff2?)$/);
await rm(published, { recursive: true, force: true });
await mkdir(published, { recursive: true });
await cp(original, published, { recursive: true });
// Compatibility for already-cached main releases: their existing startup code
// checks this manifest before rendering and refreshes to ?_release=<new SHA>.
await writeFile(join(published, 'version.json'), JSON.stringify({ version: release }) + '\n');
const finalFiles = await files(published);
assert.deepEqual(finalFiles, [...originals, 'version.json'].sort());
for (const path of originals)
  assert.deepEqual(await readFile(join(published, path)), await readFile(join(original, path)), path + ' changed during packaging.');
assert.deepEqual(JSON.parse(await readFile(join(published, 'version.json'), 'utf8')), { version: release });
console.log('PASS: all previously-tested artifact bytes preserved; only the validated public version manifest added.');
