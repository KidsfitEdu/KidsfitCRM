'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Eye, Pencil } from 'lucide-react';
import {
  formatWorkNoteList, parseWorkNote, wrapWorkNoteSelection,
  type WorkNoteMark, type WorkNoteToken,
} from '@/lib/work-note-format';

function RenderTokens({ tokens }: { tokens: WorkNoteToken[] }) {
  return <>{tokens.map((token, index) => {
    if (token.mark === 'bold') return <strong key={index}>{token.text}</strong>;
    if (token.mark === 'italic') return <em key={index}>{token.text}</em>;
    if (token.mark === 'underline') return <u key={index}>{token.text}</u>;
    return <span key={index}>{token.text}</span>;
  })}</>;
}

/** Renders plain-text CRM note markup as React text nodes; never injects HTML. */
export function AppWorkNoteContent({ content, compact = false }: { content: string; compact?: boolean }) {
  const lines = parseWorkNote(content);
  return <div className={compact ? 'space-y-1 text-sm leading-6' : 'space-y-1.5 text-sm leading-6'}>
    {lines.map((line, index) => {
      if (line.kind === 'bullet') return <p key={index} className="flex gap-2"><span aria-hidden="true" className="text-[#1b5e20]">•</span><span><RenderTokens tokens={line.tokens}/></span></p>;
      if (line.kind === 'number') return <p key={index} className="flex gap-2"><span className="text-[#1b5e20]">{lines.slice(0, index + 1).filter(x => x.kind === 'number').length}.</span><span><RenderTokens tokens={line.tokens}/></span></p>;
      return <p key={index} className="min-h-[1em] whitespace-pre-wrap break-words"><RenderTokens tokens={line.tokens}/></p>;
    })}
  </div>;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  maxLength?: number;
};

/** Two-mode editor: simple typing, formatting buttons and a safe rendered preview. */
export function AppWorkNoteEditor({ value, onChange, disabled = false, id, invalid = false, maxLength = 4000 }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const apply = (mark: WorkNoteMark) => {
    const field = inputRef.current;
    if (!field) return;
    const result = wrapWorkNoteSelection(value, field.selectionStart, field.selectionEnd, mark);
    if (result.value.length > maxLength) return;
    onChange(result.value);
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(result.start, result.end); });
  };
  const list = (ordered: boolean) => {
    const field = inputRef.current;
    if (!field) return;
    const result = formatWorkNoteList(value, field.selectionStart, field.selectionEnd, ordered);
    if (result.value.length > maxLength) return;
    onChange(result.value);
    requestAnimationFrame(() => field.focus());
  };
  const shortcuts = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    if (key !== 'b' && key !== 'i' && key !== 'u') return;
    event.preventDefault();
    apply(key === 'b' ? 'bold' : key === 'i' ? 'italic' : 'underline');
  };
  const tool = (name: string, title: string, action: () => void, icon: React.ReactNode) =>
    <button key={name} type="button" title={title} aria-label={title} disabled={disabled}
      className="inline-flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5e20] disabled:opacity-50"
      onMouseDown={event => event.preventDefault()} onClick={action}>{icon}</button>;

  return <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:border-[#1b5e20] focus-within:ring-2 focus-within:ring-[#1b5e20]/15">
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-1.5">
      {tool('bold','In đậm (Ctrl+B)',()=>apply('bold'),<Bold className="size-4"/>)}
      {tool('italic','In nghiêng (Ctrl+I)',()=>apply('italic'),<Italic className="size-4"/>)}
      {tool('underline','Gạch chân (Ctrl+U)',()=>apply('underline'),<Underline className="size-4"/>)}
      <div className="mx-1 h-5 w-px bg-border" aria-hidden="true"/>
      {tool('bullet','Danh sách',()=>list(false),<List className="size-4"/>)}
      {tool('ordered','Danh sách đánh số',()=>list(true),<ListOrdered className="size-4"/>)}
      <div className="flex-1"/>
      <button type="button" disabled={disabled} onClick={()=>setPreview(value => !value)}
        className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-[#1b5e20]">
        {preview ? <Pencil className="size-4"/> : <Eye className="size-4"/>}
        {preview ? 'Soạn thảo' : 'Xem trước'}
      </button>
    </div>
    {preview
      ? <div className="min-h-36 px-3 py-3 text-foreground">{value.trim() ? <AppWorkNoteContent content={value}/> : <p className="text-sm text-muted-foreground">Chưa có nội dung ghi chú.</p>}</div>
      : <textarea id={id} ref={inputRef} value={value} onChange={event=>onChange(event.target.value)} onKeyDown={shortcuts}
          disabled={disabled} aria-invalid={invalid} maxLength={maxLength} rows={5}
          placeholder="Ví dụ: 28/10 demo cho Phó hiệu trưởng; trường đang trình ngân sách tháng 11; hẹn gọi lại ngày 10/11."
          className="block min-h-36 w-full resize-y bg-transparent px-3 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50" />}
    <div className="border-t border-border px-3 py-1 text-right text-[11px] tabular-nums text-muted-foreground">{value.length}/{maxLength}</div>
  </div>;
}
