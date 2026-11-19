'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {ChevronDown,LoaderCircle,Search} from 'lucide-react';
import {channelRequest} from '@/lib/channel-operations';

const PAGE_SIZE=5;
type School={id:number;display_name:string;school_code:string;visible_status:string};
type SchoolPage={data:School[];total:number};
export type AllocationSchoolOption={value:string;label:string};
export const allocationSchoolPageSize=PAGE_SIZE;

export function AllocationSchoolPicker({apiBase,token,value,onChange,initialOption,invalid}:{
  apiBase:string;token:string;value:string;onChange:(id:string)=>void;
  initialOption?:AllocationSchoolOption;invalid?:boolean;
}){
  const [opened,setOpened]=useState(false);
  const [typed,setTyped]=useState('');
  const [term,setTerm]=useState('');
  const [page,setPage]=useState(1);
  const [chosen,setChosen]=useState<AllocationSchoolOption|undefined>(initialOption);
  const container=useRef<HTMLDivElement>(null);
  const input=useRef<HTMLInputElement>(null);
  const listId=useId();

  useEffect(()=>{const timer=setTimeout(()=>{setTerm(typed.trim());setPage(1);},300);return ()=>clearTimeout(timer);},[typed]);
  useEffect(()=>{
    if(!opened)return;
    const close=(event:PointerEvent)=>{if(container.current&&!container.current.contains(event.target as Node))setOpened(false);};
    document.addEventListener('pointerdown',close);
    return ()=>document.removeEventListener('pointerdown',close);
  },[opened]);
  const query=useQuery({
    queryKey:['manager-allocation-school-search',apiBase,token,term,page],
    queryFn:()=>{
      const params=new URLSearchParams({page:String(page),pageSize:String(PAGE_SIZE),status:'AVAILABLE'});
      if(term)params.set('search',term);
      return channelRequest<SchoolPage>(apiBase,token,'/schools?'+params);
    },
    enabled:opened&&!!apiBase&&!!token,
    staleTime:30_000,
    retry:1,
  });
  const totalPages=Math.max(1,Math.ceil((query.data?.total??0)/PAGE_SIZE));
  const choose=(school:School)=>{
    const option={value:String(school.id),label:school.display_name+' · '+school.school_code};
    setChosen(option);onChange(option.value);setTyped('');setTerm('');setPage(1);setOpened(false);
  };
  const display=opened?typed:(value?(chosen?.value===value?chosen.label:initialOption?.value===value?initialOption.label:'Trường đã chọn #'+value):'');
  return <div ref={container} className="relative">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true"/>
      <input ref={input} type="text" role="combobox" aria-expanded={opened} aria-controls={listId}
        aria-autocomplete="list" aria-invalid={invalid} aria-label="Tìm và chọn nhà trường"
        placeholder="Tìm tên trường hoặc mã trường..." autoComplete="off"
        value={display} onFocus={()=>{setTyped('');setTerm('');setPage(1);setOpened(true);}}
        onClick={()=>setOpened(true)}
        onChange={event=>{setTyped(event.target.value);setOpened(true);if(value){onChange('');setChosen(undefined);}}}
        onKeyDown={event=>{if(event.key==='Escape'){setOpened(false);input.current?.blur();}else if(event.key==='ArrowDown'&&!opened){setOpened(true);}}}
        className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm focus-visible:outline-2 focus-visible:outline-primary"/>
      <button type="button" aria-label={opened?'Đóng danh sách trường':'Mở danh sách trường'}
        aria-expanded={opened} onClick={()=>{if(opened){setOpened(false);input.current?.blur();}else{setOpened(true);input.current?.focus();}}}
        className="absolute right-2 top-1.5 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
        <ChevronDown className="size-4" aria-hidden="true"/>
      </button>
    </div>
    {opened&&<div id={listId} role="listbox" aria-label="Trường khả dụng"
      className="absolute left-0 right-0 top-full z-[90] mt-1 overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
      <div className="max-h-64 overflow-y-auto p-1">
        {query.isPending&&<p role="status" className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin"/>Đang tải trường...</p>}
        {query.isError&&<div className="p-3 text-sm text-destructive">
          <p>Không thể tải danh sách trường.</p>
          <button type="button" className="mt-2 underline" onClick={()=>void query.refetch()}>Thử lại</button>
        </div>}
        {query.isSuccess&&query.data.data.length===0&&<p className="p-3 text-sm text-muted-foreground">Không tìm thấy trường phù hợp.</p>}
        {query.data?.data.map(s=><button key={s.id} type="button" role="option" aria-selected={value===String(s.id)}
          onClick={()=>choose(s)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
          <span className="min-w-0 truncate"><span className="font-semibold">{s.display_name}</span><span className="ml-1 text-xs text-muted-foreground">· {s.school_code}</span></span>
        </button>)}
      </div>
      <div className="flex items-center justify-between border-t border-border p-2 text-xs text-muted-foreground">
        <span>Trang {page}/{totalPages}</span>
        <span className="flex gap-2">
          <button type="button" disabled={page<=1||query.isPending} onClick={()=>setPage(p=>Math.max(1,p-1))}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Trước</button>
          <button type="button" disabled={page>=totalPages||query.isPending} onClick={()=>setPage(p=>p+1)}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Sau</button>
        </span>
      </div>
    </div>}
  </div>;
}
