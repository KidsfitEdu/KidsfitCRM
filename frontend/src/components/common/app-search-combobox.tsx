'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type AppSearchComboboxOption = { value: string; label: string; detail?: string };
type Props = {
  id: string;
  value: string;
  options: readonly AppSearchComboboxOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

/** Single editable input: search suggestions in place, commit only an exact option value. */
export function AppSearchCombobox({id,value,options,onValueChange,placeholder='Tìm và chọn...',disabled,required,className}:Props) {
  const selected = options.find(o=>o.value===value);
  const [draft,setDraft] = useState<string | null>(null);
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(0);
  const listId = useId();
  const query = draft ?? selected?.label ?? '';
  const filtered = options.filter(o => o.label.toLocaleLowerCase('vi').includes(
    (draft ?? '').trim().toLocaleLowerCase('vi')
  ));
  const visible = filtered.slice(0,100);
  const choose=(option:AppSearchComboboxOption)=>{
    onValueChange(option.value);
    setDraft(null);
    setOpen(false);
    setActive(0);
  };
  const onKeyDown=(event:KeyboardEvent<HTMLInputElement>)=>{
    if(event.key==='ArrowDown'){
      event.preventDefault();
      if(!open){setDraft('');setOpen(true);setActive(0);}
      else setActive(i=>Math.min(i+1,visible.length-1));
    }else if(event.key==='ArrowUp'&&open){
      event.preventDefault();setActive(i=>Math.max(0,i-1));
    }else if(event.key==='Enter'&&open){
      event.preventDefault();
      if(visible[active])choose(visible[active]);
    }else if(event.key==='Escape'&&open){
      event.preventDefault();setDraft(null);setOpen(false);
    }
  };
  return <div className={cn('relative w-full min-w-0',className)}>
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
      <Input id={id} type="text" role="combobox" autoComplete="off" aria-autocomplete="list"
        aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open&&visible[active]?listId+'-option-'+active:undefined}
        aria-required={required} disabled={disabled} required={required}
        value={query} placeholder={placeholder} onKeyDown={onKeyDown}
        onFocus={()=>{if(!disabled){setDraft('');setOpen(true);setActive(0);}}}
        onChange={event=>{
          setDraft(event.target.value);onValueChange('');setOpen(true);setActive(0);
        }}
        onBlur={()=>{setOpen(false);setDraft(null);setActive(0);}}
        className="h-11 w-full rounded-xl border-input bg-background pl-10 pr-10 text-sm"/>
      {query?<button type="button" disabled={disabled} aria-label="Xóa trường đã chọn"
        onMouseDown={event=>event.preventDefault()}
        onClick={()=>{onValueChange('');setDraft('');setOpen(true);setActive(0);
          document.getElementById(id)?.focus();}}
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
        <X aria-hidden="true" className="size-4"/>
      </button>:
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>}
    </div>
    {open&&!disabled&&<div id={listId} role="listbox" aria-label="Danh sách trường được phép tái ký"
      className="absolute inset-x-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
      {visible.length===0?<p className="p-3 text-sm text-muted-foreground">Không tìm thấy trường phù hợp.</p>:
        visible.map((option,index)=><button key={option.value} type="button"
          id={listId+'-option-'+index} role="option" aria-selected={value===option.value}
          onMouseDown={event=>event.preventDefault()} onClick={()=>choose(option)}
          className={cn('flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/60',
            index===active&&'bg-primary/10 text-primary')}>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{option.label}</span>
            {option.detail&&<span className="block text-xs text-muted-foreground">{option.detail}</span>}
          </span>
          {value===option.value&&<Check aria-hidden="true" className="size-4 shrink-0"/>}
        </button>)}
    </div>}
  </div>;
}
