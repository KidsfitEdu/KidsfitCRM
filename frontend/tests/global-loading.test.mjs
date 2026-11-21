import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPendingAppRequests, subscribeAppRequests, trackAppRequest } from '../src/lib/loading-tracker.ts';

test('shared request tracker counts overlapping requests and cleans up exactly once', () => {
  const changes = [];
  const unsubscribe = subscribeAppRequests(() => changes.push(getPendingAppRequests()));
  const finishA = trackAppRequest();
  const finishB = trackAppRequest();
  assert.equal(getPendingAppRequests(), 2);
  finishA();
  finishA();
  assert.equal(getPendingAppRequests(), 1);
  finishB();
  unsubscribe();
  assert.equal(getPendingAppRequests(), 0);
  assert.deepEqual(changes, [1, 2, 1, 0]);
});

test('CRM shell reserves the mascot for an offline connection', () => {
  const shell = readFileSync(new URL('../src/components/crm/crm-app.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(shell, /MascotLoadingState state="loading"/);
  assert.match(shell, /sessionStatus === 'offline'/);
  assert.match(shell, /PageLoading label="Đang chuẩn bị màn hình/);
});

test('global motion obeys reduced-motion preferences', () => {
  const styles = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  assert.match(styles, /\.crm-page-enter/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(styles, /\.crm-skeleton, \.crm-page-enter, \.crm-global-progress-bar/);
});

test('CRM scrollbar uses branded light/dark tokens and remains accessible', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  const drawer = readFileSync(new URL('../src/components/common/drawers/app-drawer.tsx', import.meta.url), 'utf8');
  assert.match(css, /--crm-scrollbar-thumb:/);
  assert.match(css, /--crm-scrollbar-thumb-hover:/);
  assert.match(css, /scrollbar-width: thin/);
  assert.match(css, /::-webkit-scrollbar-thumb:hover/);
  assert.match(css, /forced-colors: active/);
  assert.match(css, /\.crm-scrollbar,/);
  assert.match(css, /\[data-slot="sheet-content"\] \.crm-scrollbar/);
  assert.match(css, /\.crm-scrollbar::-webkit-scrollbar-thumb/);
  assert.match(sidebar, /crm-scrollbar-sidebar.*overflow-y-auto/);
  assert.match(drawer, /crm-scrollbar min-h-0 flex-1 overflow-y-auto/);
});

test('desktop sidebar collapses to an icon rail and preserves mobile navigation', () => {
  const shell = readFileSync(new URL('../src/components/crm/crm-app.tsx', import.meta.url), 'utf8');
  const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.tsx', import.meta.url), 'utf8');
  const header = readFileSync(new URL('../src/components/layout/Header.tsx', import.meta.url), 'utf8');
  assert.match(shell, /kidsfit-crm-sidebar/);
  assert.match(shell, /localStorage\.setItem/);
  assert.match(shell, /onToggleSidebar=\{toggleSidebar\}/);
  assert.match(shell, /sidebarOpen \? "lg:pl-\[248px\]" : "lg:pl-\[72px\]"/);
  assert.match(sidebar, /sidebarOpen \? 'w-\[248px\]' : 'w-\[72px\]'/);
  assert.match(sidebar, /compact=\{!sidebarOpen\}/);
  assert.match(header, /aria-label=\{sidebarOpen \? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'\}/);
  assert.match(header, /aria-controls="crm-desktop-navigation"/);
  assert.match(header, /lg:inline-flex/);
  assert.doesNotMatch(sidebar, /onClick=\{onToggle\}/);
  assert.match(sidebar, /aria-label=\{item.label\}/);
  assert.match(sidebar, /mobilePrimary = visibleNav\.slice\(0, 4\)/);
  assert.match(sidebar, /mobileOverflow\.length > 0 && <AppDialog/);
  assert.match(sidebar, /aria-current=\{currentView === item.id \? 'page' : undefined\}/);
  assert.match(sidebar, /title=\{!sidebarOpen \? item.label : undefined\}/);
  assert.match(sidebar, /aria-label="Điều hướng di động"/);
  assert.match(header, /onClick=\{onToggleSidebar\}/);
});
