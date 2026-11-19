import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const source=readFileSync(resolve(import.meta.dirname,'../src/components/common/evidence-preview-dialog.tsx'),'utf8');

test('Evidence viewer is compact, padding-free, and leaves image stage unobstructed',()=>{
  assert.match(source,/w-\[min\(94vw,700px\)\]/);
  assert.match(source,/max-h-\[85dvh\]/);
  assert.match(source,/bg-card p-0 shadow-2xl/);
  assert.match(source,/overflow-auto overscroll-contain bg-muted\/30 p-0/);
  assert.match(source,/minWidth:'100%',minHeight:'100%'/);
  assert.match(source,/fitRatio=imageSize/);
});

test('Evidence viewer keeps only enlarge-fit and download footer actions',()=>{
  assert.match(source,/<footer className=/);
  assert.match(source,/aria-label=\{zoomLevel===1\?'Phóng to ảnh':'Vừa khung hình'\}/);
  assert.match(source,/setZoomLevel\(current=>current===1\?2:1\)/);
  assert.match(source,/download=\{preview.name\}/);
  assert.doesNotMatch(source,/<Minus|<Plus|onWheelZoom|Math.round\(zoomLevel\*100\)/);
  assert.doesNotMatch(source,/absolute bottom-4/);
});

test('Evidence viewer preserves authenticated blob preview, PDF and keyboard close',()=>{
  assert.match(source,/<Dialog open=\{preview!==null\}/);
  assert.match(source,/onOpenChange=\{open=>\{if\(!open\)onClose\(\);\}\}/);
  assert.match(source,/<DialogTitle className="sr-only">/);
  assert.match(source,/<iframe src=\{preview.url\}/);
  assert.match(source,/<img src=\{preview.url\}/);
  assert.match(source,/onClose\(\)/);
});
