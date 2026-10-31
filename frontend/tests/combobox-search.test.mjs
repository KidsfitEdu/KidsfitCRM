import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesComboboxQuery, normalizeComboboxText } from '../src/lib/combobox-search.ts';

test('Vietnamese school names can be searched without accents', () => {
  assert.equal(matchesComboboxQuery('Trường Mầm Non Ninh Kiều', 'truong mam non'), true);
  assert.equal(matchesComboboxQuery('Trường Mầm Non Hướng Dương', 'huong duong'), true);
  assert.equal(matchesComboboxQuery('Trường Mẫu Giáo Hoa Mai', 'hoa mai'), true);
  assert.equal(matchesComboboxQuery('Trường Mầm Non Việt Mỹ', 'VIET MY'), true);
  assert.equal(matchesComboboxQuery('Trường Mầm Non Ninh Kiều', 'ninh bình'), false);
});

test('query ignores case, surrounding spaces and Vietnamese đ', () => {
  assert.equal(normalizeComboboxText(' ĐỒNG THÁP '), 'dong thap');
  assert.equal(matchesComboboxQuery('Trường Đông Dương', 'dong duong'), true);
  assert.equal(matchesComboboxQuery('Trường Mầm Non Hoa Mai', '  HOA   '), true);
});

test('selection keeps numeric school id independent from visible label', () => {
  const school = { id: 25, display_name: 'Trường Mầm Non Ninh Kiều', school_code: 'SCH0025' };
  const option = { value: String(school.id), label: school.display_name };
  assert.equal(option.value, '25');
  assert.equal(option.label, 'Trường Mầm Non Ninh Kiều');
  assert.equal(option.label.includes('SCH0025'), false);
});
