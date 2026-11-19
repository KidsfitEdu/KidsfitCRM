import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const source=readFileSync(resolve(import.meta.dirname,'../src/components/common/evidence-preview-dialog.tsx'),'utf8');

test('Evidence viewer has no frame padding, header or footer and respects image aspect ratio',()=>{
  assert.match(source,/max-w-\[min\(92vw,560px\)\] max-h-\[80dvh\]/);
  assert.match(source,/bg-transparent p-0 shadow-2xl/);
  assert.match(source,/fixed top-1\/2 left-1\/2 flex w-fit/);
  assert.match(source,/-translate-x-1\/2 -translate-y-1\/2/);
  assert.doesNotMatch(source,/className=\{`relative flex w-fit/);
  assert.match(source,/className="mx-auto block h-auto max-h-\[80dvh\] w-auto max-w-full select-none object-contain"/);
  assert.match(source,/relative min-h-0 w-full overflow-hidden rounded-2xl/);
  assert.doesNotMatch(source,/<footer|fitRatio|onWheelZoom|<Maximize2/);
});

test('Download floats at bottom right of image; close at top right',()=>{
  assert.match(source,/absolute right-2 top-2 z-10 size-9 rounded-full/);
  assert.match(source,/absolute bottom-2 right-2 z-10 inline-flex size-10/);
  assert.match(source,/download=\{preview.name\}/);
  assert.match(source,/aria-label="Tải chứng từ"/);
  assert.match(source,/aria-label="Đóng xem chứng từ"/);
});

test('Evidence viewer preserves PDF and accessible dialog close behavior',()=>{
  assert.match(source,/<Dialog open=\{preview!==null\}/);
  assert.match(source,/onOpenChange=\{open=>\{if\(!open\)onClose\(\);\}\}/);
  assert.match(source,/<DialogTitle className="sr-only">/);
  assert.match(source,/<iframe src=\{preview.url\}/);
  assert.match(source,/<img src=\{preview.url\}/);
  assert.match(source,/Định dạng này chưa hỗ trợ xem trực tiếp/);
});
