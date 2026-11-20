import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');
const picker=read('src/screens/Accounting/Contracts/AccountingReceivablePicker.tsx');
const page=read('src/screens/Accounting/Contracts/AccountingContractsPage.tsx');

test('Receipt search retains input focus and first character when suggestions open',()=>{
  assert.match(picker,/initialFocus=\{false\} finalFocus=\{false\}/);
  assert.match(picker,/if\(next\)setActive\(0\)/);
  assert.doesNotMatch(picker,/if\(next\)\{onQueryChange\(''\)/);
  assert.match(picker,/onChange=\{e=>\{setSearch\(e\.currentTarget\.value\);if\(!open\)onOpenChange\(true\);\}\}/);
  assert.match(picker,/onMouseDown=\{event=>event\.preventDefault\(\)\}/);
});

test('Receipt option is compact, keyboard accessible and shows school, code and remaining amount on one row',()=>{
  assert.match(picker,/role="combobox" aria-autocomplete="list"/);
  assert.match(picker,/role="listbox"/);
  assert.match(picker,/role="option"/);
  assert.match(picker,/e\.key==='Enter'/);
  assert.match(picker,/e\.key==='Escape'/);
  assert.match(picker,/min-h-10 w-full items-center gap-2/);
  assert.match(picker,/min-w-0 flex-1 truncate font-medium/);
  assert.match(picker,/channelMoney\(item\.amount_remaining\)/);
  assert.match(picker,/onPageChange\(page\+1\)/);
});

test('Receipt payment schedule options also use a compact single row',()=>{
  assert.match(page,/min-h-10 rounded-lg px-3 py-1\.5 pr-9/);
  assert.match(page,/min-w-0 flex-1 items-center justify-between gap-3 pr-1/);
  assert.match(page,/channelMoney\(x\.amount_due-x\.amount_received\)/);
  assert.match(page,/setSelectedScheduleId\(value\?Number\(value\):null\)/);
});
