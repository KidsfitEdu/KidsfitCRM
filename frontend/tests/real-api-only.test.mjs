import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');

test('production has one real-API entrypoint without mock authentication', () => {
  const page = source('src/app/page.tsx');
  const app = source('src/components/crm/crm-app.tsx');
  assert.match(page, /<CrmApp\s*\/>/);
  assert.match(app, /NEXT_PUBLIC_API_URL/);
  assert.match(app, /['"]\/login['"]/);
  assert.match(app, /['"]\/me['"]/);
  assert.doesNotMatch(app, /DemoAccount|demoAccount|DemoCrmApp|NEXT_PUBLIC_DEMO_MODE|initialWorkspace/);
  assert.doesNotMatch(app, /@\/lib\/demo-auth/);
});

test('legacy static demo targets and public mock credentials are absent', () => {
  for (const p of ['demo', 'vite.pages.config.ts', 'src/lib/demo-auth.ts',
    'src/components/crm/demo-access.tsx']) {
    assert.equal(existsSync(resolve(root, p)), false, p);
  }
  const packageJson = source('package.json');
  assert.doesNotMatch(packageJson, /build:pages|preview:pages|test:demo/);
});

test('school directory, operations and manager data load only from Backend', () => {
  for (const p of ['src/components/crm/school-directory.tsx',
    'src/components/crm/school-operations.tsx',
    'src/components/roles/ManagerWorklists.tsx']) {
    const s = source(p);
    assert.doesNotMatch(s, /\/demo\/|schoolOperationsPreview|readSchoolDemo|demoChannelSalesWorkspace/);
    assert.match(s, /channelRequest|const api/);
  }
});
