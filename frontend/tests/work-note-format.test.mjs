import assert from 'node:assert/strict';
import test from 'node:test';
import { tokenizeWorkNote, parseWorkNote, wrapWorkNoteSelection, formatWorkNoteList } from '../src/lib/work-note-format.ts';

test('CRM work notes retain Vietnamese text with bold, italic, underline and bullet lines', () => {
  const content = '**28/10** demo với *Phó hiệu trưởng*; trường __chờ ngân sách__.\n- Gọi lại 10/11';
  const lines = parseWorkNote(content);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].tokens[0].mark, 'bold');
  assert.equal(lines[0].tokens[1].text, ' demo với ');
  assert.equal(lines[0].tokens[2].mark, 'italic');
  assert.equal(lines[0].tokens[4].mark, 'underline');
  assert.equal(lines[1].kind, 'bullet');
  assert.equal(lines[1].tokens[0].text, 'Gọi lại 10/11');
});

test('formatting selected text retains its location and input as plain text', () => {
  const source = 'Hẹn gọi lại 10/11';
  const result = wrapWorkNoteSelection(source, 4, 11, 'bold');
  assert.equal(result.value, 'Hẹn **gọi lại** 10/11');
  assert.equal(result.start, 6);
  assert.equal(result.end, 13);
  assert.equal(tokenizeWorkNote(result.value)[1].text, 'gọi lại');
});

test('formatting lists does not remove unrelated lines', () => {
  const result = formatWorkNoteList('Trước\nGọi lại\nDemo\nSau', 6, 18, true);
  assert.equal(result.value, 'Trước\n1. Gọi lại\n2. Demo\nSau');
});

test('HTML-like user text is always plain text tokens, never executable markup', () => {
  const html = '<img src=x onerror=alert(1)>';
  const tokens = tokenizeWorkNote(html);
  assert.deepEqual(tokens, [{ text: html }]);
});
