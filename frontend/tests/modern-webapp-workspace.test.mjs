import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('mobile dock shows at most four authorized shortcuts and a complete More dialog', () => {
  const sidebar = source('components/layout/Sidebar.tsx');
  assert.match(sidebar, /mobilePrimary = visibleNav\.slice\(0, 4\)/);
  assert.match(sidebar, /mobileOverflow = visibleNav\.slice\(4\)/);
  assert.match(sidebar, /mobilePrimary\.map\(item =>/);
  assert.match(sidebar, /mobileOverflow\.length > 0 && <AppDialog/);
  assert.match(sidebar, /visibleNav\.map\(item => <button key=\{item\.id\} type="button" onClick=\{\(\) => navigate\(item\.id\)\}/);
  assert.match(sidebar, /aria-label="Xem tất cả chức năng"/);
  assert.match(sidebar, /aria-current=\{currentView === item\.id \? 'page' : undefined\}/);
  assert.doesNotMatch(sidebar, /overflow-x-auto rounded-2xl border border-white\/10 bg-\[var\(--deep\)\]/);
});

test('desktop navigation preserves original role-filtered entries and sidebar contract', () => {
  const sidebar = source('components/layout/Sidebar.tsx');
  const app = source('components/crm/crm-app.tsx');
  assert.match(sidebar, /id="crm-desktop-navigation"/);
  assert.match(sidebar, /visibleNav\.map\(item =>/);
  assert.match(sidebar, /w-\[248px\]/);
  assert.match(sidebar, /w-\[72px\]/);
  assert.match(app, /visibleNav=\{visibleNav\} currentView=\{currentView\} onNavigate=\{navigate\}/);
  assert.match(app, /role-accounting-|role-sales-staff-/);
});

test('mobile shell and overlay actions respect the virtual keyboard and device safe area', () => {
  const css = source('app/globals.css');
  const app = source('components/crm/crm-app.tsx');
  const drawer = source('components/common/drawers/app-drawer.tsx');
  const dialog = source('components/common/dialogs/app-dialog.tsx');
  assert.match(css, /crm-mobile-dock \{ bottom: var\(--crm-dock-bottom\); \}/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(app, /pb-\[calc\(6\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(drawer, /h-dvh w-screen/);
  assert.match(drawer, /pb-\[calc\(\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(dialog, /max-h-\[min\(92dvh,800px\)\]/);
  assert.match(dialog, /flex-1 overflow-y-auto/);
});

test('role-wide shared presentation maintains app-like density and semantic theming', () => {
  const header = source('components/layout/Header.tsx');
  const page = source('components/common/app-page-header.tsx');
  const stat = source('components/common/app-stat-card.tsx');
  const list = source('components/common/admin-list-ui.tsx');
  const auth = source('screens/Auth/AuthShell.tsx');
  assert.match(header, /Xin chào, \{userName\}/);
  assert.match(header, /aria-label="Mở tìm kiếm"/);
  assert.match(page, /text-primary/);
  assert.match(stat, /bg-primary\/10 text-primary/);
  assert.match(list, /flex-\[1_1_100%\]/);
  assert.match(list, /inline-flex size-10/);
  assert.match(auth, /bg-\[#0e2a1a\]/);
});
