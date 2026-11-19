'use client';

import {useState} from 'react';
import {CalendarDays, ChevronLeft, ChevronRight} from 'lucide-react';
import {format, isValid, parseISO} from 'date-fns';
import {vi} from 'date-fns/locale';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';

/** Compact date-only picker. Keeps the yyyy-MM-dd value used by CRM APIs. */
export function AppDatePicker({value,onChange,label,className='',invalid=false,fieldName}:{
  value:string;onChange:(value:string)=>void;label:string;className?:string;
  invalid?:boolean;fieldName?:string;
}){
  const [open,setOpen]=useState(false);
  const [choosingMonth,setChoosingMonth]=useState(false);
  const [displayMonth,setDisplayMonth]=useState<Date>(()=>new Date());
  const parsed=value?parseISO(value):null;
  const selected=parsed&&isValid(parsed)?parsed:undefined;

  const begin=()=>{
    const basis=selected??new Date();
    setDisplayMonth(new Date(basis.getFullYear(),basis.getMonth(),1));
    setChoosingMonth(false);
    setOpen(true);
  };
  const moveMonth=(offset:number)=>{
    setDisplayMonth(month=>{
      const next=new Date(month.getFullYear(),month.getMonth()+offset,1);
      return next.getFullYear()<2000||next.getFullYear()>2100?month:next;
    });
  };
  const displayedYear=displayMonth.getFullYear();
  const displayedMonth=displayMonth.getMonth();
  return <Popover open={open} onOpenChange={next=>{
    setOpen(next);
    if(!next)setChoosingMonth(false);
  }}>
    <PopoverTrigger render={
      <button type="button" aria-label={label} aria-haspopup="dialog" aria-invalid={invalid}
        data-field={fieldName}
        className={['flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm shadow-xs transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-destructive',className].join(' ')}
        onClick={begin}/>
    }>
      <span className={selected?'truncate text-foreground':'truncate text-muted-foreground'}>
        {selected?format(selected,'dd/MM/yyyy'):label}
      </span>
      <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true"/>
    </PopoverTrigger>
    <PopoverContent align="start" side="bottom" sideOffset={6}
      className="z-[80] w-[min(250px,calc(100vw-24px))] rounded-xl border border-border bg-popover p-2.5 shadow-lg">
      <div className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-1">
        <button type="button" aria-label="Tháng trước" disabled={displayedYear===2000&&displayedMonth===0}
          className="flex size-8 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
          onClick={()=>moveMonth(-1)}><ChevronLeft className="size-4" aria-hidden="true"/></button>
        <button type="button" aria-label="Chọn nhanh tháng và năm" aria-expanded={choosingMonth}
          className="min-w-0 rounded-lg px-1 py-1.5 text-center text-xs font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
          onClick={()=>setChoosingMonth(v=>!v)}>
          {format(displayMonth,'LLLL yyyy',{locale:vi})}
        </button>
        <button type="button" aria-label="Tháng sau" disabled={displayedYear===2100&&displayedMonth===11}
          className="flex size-8 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
          onClick={()=>moveMonth(1)}><ChevronRight className="size-4" aria-hidden="true"/></button>
      </div>
      {choosingMonth
        ?<div className="space-y-2 pt-2">
          <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            Năm
            <select aria-label="Chọn năm" value={displayedYear}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              onChange={event=>setDisplayMonth(new Date(Number(event.target.value),displayedMonth,1))}>
              {Array.from({length:101},(_,index)=>2000+index).map(year=><option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <div role="group" aria-label="Chọn tháng" className="grid grid-cols-3 gap-1">
            {Array.from({length:12},(_,index)=>index).map(month=><button type="button" key={month}
              aria-pressed={month===displayedMonth}
              className={'rounded-lg px-1 py-2 text-xs font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary '+(month===displayedMonth?'bg-primary text-primary-foreground hover:bg-primary':'')}
              onClick={()=>{setDisplayMonth(new Date(displayedYear,month,1));setChoosingMonth(false);}}>
              Tháng {month+1}
            </button>)}
          </div>
        </div>
        :<Calendar mode="single" selected={selected} month={displayMonth} onMonthChange={setDisplayMonth}
          captionLayout="label" hideNavigation
          startMonth={new Date(2000,0,1)} endMonth={new Date(2100,11,31)}
          showOutsideDays={false} locale={vi} weekStartsOn={1}
          className="mx-auto mt-1 w-fit max-w-full p-0 [--cell-size:1.75rem] [&_[data-selected-single=true]]:!rounded-full [&_[data-selected-single=true]]:!bg-primary [&_[data-selected-single=true]]:!text-primary-foreground"
          classNames={{
            month:'flex w-full flex-col gap-2',
            months:'flex flex-col gap-0',
            month_caption:'sr-only',
            week:'mt-1 flex w-full',
            day:'group/day relative aspect-square h-full w-full rounded-full p-0 text-center',
            day_button:'rounded-full',
          }}
          onSelect={date=>{
            if(!date)return;
            onChange(format(date,'yyyy-MM-dd'));
            setOpen(false);
          }}/>}
      {value&&<button type="button" className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
        onClick={()=>{onChange('');setOpen(false);}}>Xóa ngày đã chọn</button>}
    </PopoverContent>
  </Popover>;
}
