'use client';

import {useState} from 'react';
import {CalendarDays, ChevronLeft, ChevronRight} from 'lucide-react';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';

/** Compact Vietnamese month/year filter. Empty value means all time. */
export function AppMonthPicker({value,onChange,label='Tháng/Năm',className='',allowAll=true}:{
  value:string;onChange:(value:string)=>void;label?:string;className?:string;allowAll?:boolean;
}){
  const [open,setOpen]=useState(false);
  const currentYear=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric'}).format(new Date()));
  const [viewYear,setViewYear]=useState(()=>Number(value.slice(0,4))||currentYear);
  const [showYears,setShowYears]=useState(false);
  const valid=/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  const selectedYear=valid?Number(value.slice(0,4)):0;
  const selectedMonth=valid?Number(value.slice(5,7)):0;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<button type="button" aria-label={label} aria-haspopup="dialog"
      className={['flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm shadow-xs transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary',className].join(' ')}
      onClick={()=>{setViewYear(selectedYear||currentYear);setOpen(true);}}/>}>
      <span className={valid?'truncate text-foreground':'truncate text-muted-foreground'}>
        {valid?`Tháng ${selectedMonth}/${selectedYear}`:'Tất cả thời gian'}
      </span>
      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true"/>
    </PopoverTrigger>
    <PopoverContent align="start" side="bottom" sideOffset={6}
      className="z-[80] w-[min(250px,calc(100vw-24px))] rounded-xl border border-border bg-popover p-2.5 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button type="button" aria-label="Năm trước" className="rounded-md p-1.5 hover:bg-muted"
          onClick={()=>setViewYear(y=>Math.max(2000,y-1))}><ChevronLeft className="size-4"/></button>
        <button type="button" className="rounded-md px-2 py-1 text-sm font-semibold hover:bg-muted"
          onClick={()=>setShowYears(v=>!v)} aria-expanded={showYears}>{viewYear}</button>
        <button type="button" aria-label="Năm sau" className="rounded-md p-1.5 hover:bg-muted"
          onClick={()=>setViewYear(y=>Math.min(2100,y+1))}><ChevronRight className="size-4"/></button>
      </div>
      {showYears?<div className="grid max-h-40 grid-cols-3 gap-1 overflow-y-auto">
        {Array.from({length:101},(_,i)=>2000+i).map(y=><button type="button" key={y}
          className={'rounded-md px-2 py-2 text-xs hover:bg-muted '+(y===viewYear?'bg-primary text-primary-foreground':'')}
          onClick={()=>{setViewYear(y);setShowYears(false);}}>{y}</button>)}
      </div>:<div className="grid grid-cols-3 gap-1">
        {Array.from({length:12},(_,i)=>i+1).map(m=><button type="button" key={m}
          aria-pressed={selectedYear===viewYear&&selectedMonth===m}
          className={'rounded-md px-2 py-2.5 text-xs font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary '+(selectedYear===viewYear&&selectedMonth===m?'bg-primary text-primary-foreground hover:bg-primary':'')}
          onClick={()=>{onChange(`${viewYear}-${String(m).padStart(2,'0')}`);setOpen(false);}}>
          Tháng {m}
        </button>)}
      </div>}
      {allowAll&&<button type="button" className="mt-2 w-full rounded-lg border border-border px-2 py-2 text-xs text-muted-foreground hover:bg-muted"
        onClick={()=>{onChange('');setOpen(false);}}>Tất cả thời gian</button>}
    </PopoverContent>
  </Popover>;
}
