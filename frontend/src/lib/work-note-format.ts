/**
 * Safe, deliberately small CRM note syntax. Notes stay UTF-8 plain text in the
 * existing CustomerActivity.Content column; no HTML is persisted or executed.
 *
 * **bold**, *italic*, __underline__, lines starting "- " or "1. ".
 */
export type WorkNoteMark = 'bold' | 'italic' | 'underline';
export type WorkNoteToken = { text: string; mark?: WorkNoteMark };
export type WorkNoteLine = { kind: 'paragraph' | 'bullet' | 'number'; tokens: WorkNoteToken[] };

export function plainWorkNoteLength(value: string): number {
  return value.replace(/\*\*|__|\*/g, '').trim().length;
}

export function wrapWorkNoteSelection(
  value: string, start: number, end: number, mark: WorkNoteMark,
): { value: string; start: number; end: number } {
  const delimiter = mark === 'bold' ? '**' : mark === 'underline' ? '__' : '*';
  const selection = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);
  const next = before + delimiter + selection + delimiter + after;
  return { value: next, start: start + delimiter.length, end: end + delimiter.length };
}

export function formatWorkNoteList(value: string, start: number, end: number, ordered: boolean) {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEnd = value.indexOf('\n', end);
  const last = lineEnd < 0 ? value.length : lineEnd;
  const lines = value.slice(lineStart, last).split('\n');
  const formatted = lines.map((line, i) => {
    const clean = line.replace(/^\s*(?:- |\d+\. )/, '');
    return (ordered ? `${i + 1}. ` : '- ') + clean;
  }).join('\n');
  return { value: value.slice(0, lineStart) + formatted + value.slice(last) };
}

export function tokenizeWorkNote(value: string): WorkNoteToken[] {
  const tokens: WorkNoteToken[] = [];
  const pattern = /\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*/g;
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    const offset = match.index;
    if (offset > last) tokens.push({ text: value.slice(last, offset) });
    tokens.push({ text: match[1] ?? match[2] ?? match[3], mark: match[1] ? 'bold' : match[2] ? 'underline' : 'italic' });
    last = offset + match[0].length;
  }
  if (last < value.length) tokens.push({ text: value.slice(last) });
  return tokens;
}

export function parseWorkNote(value: string): WorkNoteLine[] {
  return value.split(/\r?\n/).map(line => {
    const bullet = /^\s*- (.*)$/.exec(line);
    if (bullet) return { kind: 'bullet' as const, tokens: tokenizeWorkNote(bullet[1]) };
    const number = /^\s*\d+\. (.*)$/.exec(line);
    if (number) return { kind: 'number' as const, tokens: tokenizeWorkNote(number[1]) };
    return { kind: 'paragraph' as const, tokens: tokenizeWorkNote(line) };
  });
}
