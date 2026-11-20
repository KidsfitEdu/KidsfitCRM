import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');
const css = read('src/app/globals.css');
const list = read('src/components/common/admin-list-ui.tsx');
const header = read('src/components/layout/Header.tsx');
const sidebar = read('src/components/layout/Sidebar.tsx');

const rgb = hex => hex.match(/.{2}/g).map(x => parseInt(x, 16) / 255);
const luminance = hex => rgb(hex.replace('#', '')).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
};

test('dark semantic surfaces are charcoal, visibly tiered, and retain emerald brand contrast', () => {
  const dark = css.split('/* Modern Dark: neutral charcoal surfaces and restrained emerald hierarchy. */')[1]
    ?.split('\n}')[0] ?? '';
  for (const [name, hex] of Object.entries({
    background: '#101715',
    card: '#1b2421',
    popover: '#202a25',
    primary: '#78c79a',
    muted: '#26312c',
    accent: '#30453a',
    border: '#34433b',
    sidebar: '#10291d',
  })) assert.match(dark, new RegExp('--' + name + ':\\s*' + hex, 'i'));
  assert.ok(contrast('#f1f5f2', '#101715') >= 4.5, 'Workspace body text contrast');
  assert.ok(contrast('#f1f5f2', '#1b2421') >= 4.5, 'Card body text contrast');
  assert.ok(contrast('#a9b9ae', '#1b2421') >= 4.5, 'Secondary text contrast');
  assert.ok(contrast('#78c79a', '#1b2421') >= 4.5, 'Emerald on card contrast');
  assert.ok(contrast('#ffffff', '#234d35') >= 4.5, 'Table headings remain readable');
});

test('light theme semantic colors and table presentation remain unchanged', () => {
  assert.match(css, /--background: #f9fafb; --foreground: #111827;/);
  assert.match(css, /--card: #fff; --card-foreground: #111827;/);
  assert.match(css, /--primary: #1b5e20; --primary-foreground: #fff;/);
  assert.match(css, /\.crm-workspace-content table:not\(\.crm-school-table\) thead \{\s*background: #1b5e20;/);
  assert.match(css, /\.dark \.crm-workspace-content table:not\(\.crm-school-table\) thead \{\s*background: #234d35;/);
  assert.match(list, /dark:bg-\[#234d35\]/);
});

test('dark shared controls and navigation provide distinct surfaces and focus states', () => {
  assert.match(list, /dark:border-input dark:bg-muted\/70/);
  assert.match(list, /dark:bg-muted\/50 dark:shadow-none/);
  assert.match(list, /dark:hover:bg-primary\/15/);
  assert.match(header, /dark:bg-card\/95/);
  assert.match(header, /dark:border-input dark:bg-muted\/70/);
  assert.match(header, /dark:text-primary/);
  assert.match(sidebar, /dark:text-\[#a9b9ae\]/);
  assert.match(sidebar, /dark:hover:text-white/);
  assert.match(sidebar, /dark:bg-\[#264935\]/);
  assert.match(css, /\.dark \.crm-brand-menu-active \{/);
  assert.match(css, /\.dark \.crm-workspace-content table:not\(\.crm-school-table\) tbody tr:nth-child\(even\):hover/);
});
