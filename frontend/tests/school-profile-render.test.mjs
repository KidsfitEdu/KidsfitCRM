import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Render the real TSX through Vite's SSR transformer rather than inspecting its source.
let vite;
let SchoolProfileDetails;
let formatSchoolAddress;
const root = resolve(import.meta.dirname, '..');
const unit = (id, type, name, fields = {}) => ({
  id, unit_type: type, name, province: 'Cần Thơ', ward: 'Ninh Kiều', ...fields,
});
const render = (props) => renderToStaticMarkup(React.createElement(SchoolProfileDetails, props));

before(async () => {
  vite = await createServer({
    root,
    configFile: false,
    appType: 'custom',
    server: { middlewareMode: true, hmr: false },
    ssr: { noExternal: ['lucide-react'] },
  });
  ({ SchoolProfileDetails, formatSchoolAddress } =
    await vite.ssrLoadModule('/src/components/crm/schools/school-profile-details.tsx'));
});

after(async () => { await vite?.close(); });

test('empty branches show an empty state and main school only once', () => {
  const html = render({ units: [unit(1, 'MAIN', 'Trường Mầm Non A')] });
  assert.match(html, /Trường chưa có phân hiệu/);
  assert.equal((html.match(/aria-label="Thông tin trường chính"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-label="Phân hiệu"/g) ?? []).length, 1);
});

test('one or multiple branches render only BRANCH units in their section', () => {
  const branches = [unit(2, 'BRANCH', 'Phân hiệu A'), unit(3, 'BRANCH', 'Phân hiệu B')];
  for (const count of [1, 2]) {
    const html = render({ units: [unit(1, 'MAIN', 'Trường chính'), ...branches.slice(0, count)] });
    assert.match(html, new RegExp(count + ' phân hiệu'));
    assert.equal((html.match(/aria-label="Thông tin trường chính"/g) ?? []).length, 1);
    assert.equal((html.match(/<h4/g) ?? []).length, count);
  }
});

test('missing MAIN keeps an authorized summary without manufacturing a main unit', () => {
  const html = render({
    units: [unit(2, 'BRANCH', 'Phân hiệu A')],
    displayName: 'Trường thuộc hồ sơ',
    schoolCode: 'SCH-42',
    statusLabel: 'Đang tiếp cận',
  });
  assert.match(html, /Trường thuộc hồ sơ/);
  assert.match(html, /SCH-42/);
  assert.match(html, /Đang tiếp cận/);
  assert.match(html, /Chưa có thông tin trường chính/);
  assert.doesNotMatch(html, /aria-label="Thông tin trường chính"/);
});

test('missing contact values, long names and address render as readable text', () => {
  const longName = 'Tên trường học '.repeat(50);
  const html = render({ units: [unit(1, 'MAIN', longName, {
    address: '123 Đường Nguyễn Văn Cừ',
    email: null, school_phone: null,
  })] });
  assert.match(html, /Chưa cập nhật/);
  assert.match(html, /break-words/);
  assert.match(html, /123 Đường Nguyễn Văn Cừ/);
});

test('duplicate MAIN units display a diagnostic without repeating the main section', () => {
  const html = render({ units: [unit(1, 'MAIN', 'Trường A'), unit(2, 'MAIN', 'Trường B')] });
  assert.match(html, /nhiều đơn vị trường chính/);
  assert.equal((html.match(/aria-label="Thông tin trường chính"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<h4[^>]*>Trường B/);
});

test('address matcher deduplicates complete geographic segments without dropping street text', () => {
  assert.equal(formatSchoolAddress(unit(1, 'MAIN', 'A', {
    address: '123 Đường A, Phường Ninh Kiều, Thành phố Cần Thơ',
  })), '123 Đường A, Phường Ninh Kiều, Thành phố Cần Thơ');
  assert.equal(formatSchoolAddress(unit(1, 'MAIN', 'A', {
    address: 'Đường Cần Thơ số 7', ward: 'Ninh Kiều', province: 'Cần Thơ',
  })), 'Đường Cần Thơ số 7, Ninh Kiều, Cần Thơ');
});
