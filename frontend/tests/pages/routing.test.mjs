import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('Vinext view route validates known IDs, without React Router', () => {
  const route = read('app/crm/[view]/page.tsx');
  const map = read('src/config/routes.ts');
  const navigation = read('src/config/navigation.ts');
  assert.match(route, /if\(!isView\(view\)\)notFound\(\)/);
  assert.match(map, /const ids = new Set<View>/);
  assert.match(map, /pathname\.match\(/);
  assert.match(map, /return '\/crm\/'\+view/);
  assert.match(navigation, /export type View/);
  assert.doesNotMatch(route, /react-router-dom/);
});

test('Sidebar click and browser history use the same guarded navigation callback', () => {
  const app = read('src/src/components/crm/crm-app.tsx');
  const sidebar = read('src/components/layout/Sidebar.tsx');
  assert.match(app, /visibleNav\.some\(item=>item\.id===next\)/);
  assert.match(app, /window\.history\.pushState\(null,'',viewToPath\(next\)\)/);
  assert.match(app, /window\.addEventListener\('popstate',onPop\)/);
  assert.match(sidebar, /onNavigate\(item\.id\)/);
});

test('shared QueryClient belongs to a keyed session, not separate role workspaces', () => {
  const app = read('src/components/crm/crm-app.tsx');
  const provider = read('src/providers/AppProviders.tsx');
  assert.match(app, /<AppProviders key=\{demoAccount\?\.id \?\? token/);
  assert.match(provider, /new QueryClient\(/);
  for (const profile of ['Board','Accounting','CustomerCare','SalesStaff','Collaborator','Checkee','SalesManager']) {
    const workspace = read('src/pages/'+profile+'/'+profile+'Workspace.tsx');
    assert.doesNotMatch(workspace, /new QueryClient\(/);
  }
});
