'use client';

import {useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {format, isValid, parseISO} from 'date-fns';
import {vi} from 'date-fns/locale';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';

/** Date-only filter based on CRM's existing calendar and popover primitives. */
export function AppDatePicker({value,onChange,label,className=''}:{
  value:string;onChange:(value:string)=>void;label:string;className?:string;
}){
  const [open,setOpen]=useState(false);
  const parsed=value?parseISO(value):null;
  const selected=parsed&&isValid(parsed)?parsed:undefined;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={
      <button type="button" aria-label={label} aria-haspopup="dialog"
        className={['flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm shadow-xs transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',className].join(' ')}
        onClick={()=>setOpen(true)}/>
    }>
      <span className={selected?'truncate text-foreground':'truncate text-muted-foreground'}>
        {selected?format(selected,'dd/MM/yyyy'):label}
      </span>
      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true"/>
    </PopoverTrigger>
    <PopoverContent align="start" side="bottom" sideOffset={6}
      className="z-[80] w-[min(320px,calc(100vw-24px))] rounded-xl border border-border bg-popover p-3 shadow-lg">
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <Calendar mode="single" selected={selected} captionLayout="dropdown"
        startMonth={new Date(2000,0,1)} endMonth={new Date(2100,11,31)}
        showOutsideDays={false} locale={vi} weekStartsOn={1}
        className="mx-auto w-fit max-w-full p-0"
        onSelect={date=>{
          if(!date)return;
          onChange(format(date,'yyyy-MM-dd'));
          setOpen(false);
        }}/>
      {value&&<button type="button" className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        onClick={()=>{onChange('');setOpen(false);}}>Xóa ngày đã chọn</button>}
    </PopoverContent>
  </Popover>;
}
