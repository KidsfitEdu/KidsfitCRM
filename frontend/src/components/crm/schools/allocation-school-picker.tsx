'use client';

/* eslint-disable jsx-a11y/prefer-tag-over-role -- Server-paginated search requires custom listbox semantics. */

import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {ChevronDown,LoaderCircle,Search,X} from 'lucide-react';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import {Input} from '@/components/ui/input';
import {channelRequest,channelQueryKeys} from '@/lib/channel-operations';

const PAGE_SIZE=5;
type School={id:number;display_name:string;school_code:string;visible_status:string};
type SchoolPage={data:School[];total:number};
export type AllocationSchoolOption={value:string;label:string};
export const allocationSchoolPageSize=PAGE_SIZE;

/** Server-side, five-row picker: the portaled popup never expands the action dialog. */
export function AllocationSchoolPicker({apiBase,token,value,onChange,initialOption,invalid}:{
  apiBase:string;token:string;value:string;onChange:(id:string)=>void;
  initialOption?:AllocationSchoolOption;invalid?:boolean;
}){
  const [opened,setOpened]=useState(false);
  const [typed,setTyped]=useState('');
  const [term,setTerm]=useState('');
  const [page,setPage]=useState(1);
  const [active,setActive]=useState(0);
  const [chosen,setChosen]=useState<AllocationSchoolOption|undefined>(initialOption);

  useEffect(()=>{
    const timer=setTimeout(()=>{setTerm(typed.trim());setPage(1);},300);
    return ()=>clearTimeout(timer);
  },[typed]);
  const query=useQuery({
    queryKey:[...channelQueryKeys.all,'manager-allocation-school-search',apiBase,token,term,page],
    queryFn:()=>{
      const params=new URLSearchParams({page:String(page),pageSize:String(PAGE_SIZE),status:'AVAILABLE'});
      if(term)params.set('search',term);
      return channelRequest<SchoolPage>(apiBase,token,'/schools?'+params);
    },
    enabled:opened&&!!apiBase&&!!token,
    staleTime:30_000,retry:1,
  });
  const searching=typed.trim()!==term;
  const schools=searching?[]:(query.data?.data??[]);
  const totalPages=searching?1:Math.max(1,Math.ceil((query.data?.total??0)/PAGE_SIZE));
  const choose=(school:School)=>{
    const option={value:String(school.id),label:school.display_name+' · '+school.school_code};
    setChosen(option);onChange(option.value);setTyped('');setTerm('');setPage(1);setActive(0);setOpened(false);
  };
  const display=opened?typed:(value?(chosen?.value===value?chosen.label:initialOption?.value===value?initialOption.label:'Trường đã chọn #'+value):'');
  const search=(text:string)=>{
    setTyped(text);setPage(1);setActive(0);
    if(value){onChange('');setChosen(undefined);}
    if(!opened)setOpened(true);
  };
  return <Popover open={opened} onOpenChange={setOpened}>
    <div className="relative min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
      <PopoverTrigger render={<Input
        aria-label="Tìm và chọn nhà trường" aria-invalid={invalid}
        aria-expanded={opened} aria-controls="manager-allocation-school-options"
        aria-activedescendant={opened&&schools[active]?'manager-allocation-school-'+schools[active].id:undefined}
        role="combobox" aria-autocomplete="list" type="search" autoComplete="off"
        placeholder="Tìm tên trường hoặc mã trường..." value={display}
        className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-9 text-sm focus-visible:border-primary"
        onClick={()=>setOpened(true)}
        onChange={event=>search(event.currentTarget.value)}
        onKeyDown={event=>{
          if(event.key==='ArrowDown'){
            event.preventDefault();
            if(!opened){setOpened(true);return;}
            setActive(index=>Math.min(index+1,Math.max(0,schools.length-1)));
          }else if(event.key==='ArrowUp'&&opened){
            event.preventDefault();setActive(index=>Math.max(0,index-1));
          }else if(event.key==='Enter'&&opened){
            event.preventDefault();if(!query.isPending&&!searching&&schools[active])choose(schools[active]);
          }else if(event.key==='Escape'&&opened){
            event.preventDefault();event.stopPropagation();setOpened(false);
          }
        }}
      />}/>
      {typed&&opened
        ?<button type="button" aria-label="Xóa từ khóa tìm trường" title="Xóa tìm kiếm"
          onMouseDown={event=>event.preventDefault()}
          onClick={()=>search('')}
          className="absolute right-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
          <X className="size-4" aria-hidden="true"/>
        </button>
        :<ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>}
    </div>
    <PopoverContent align="start" side="bottom" sideOffset={5} initialFocus={false} finalFocus={false}
      className="z-[90] w-[min(var(--anchor-width),calc(100vw-24px))] max-h-[min(315px,48dvh)] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-xl">
      <div id="manager-allocation-school-options" role="listbox" aria-label="Trường có thể phân bổ" className="space-y-0.5">
        {(query.isPending||searching)&&<output className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true"/>Đang tải trường...</output>}
        {query.isError&&!searching&&<div className="p-3 text-sm text-destructive">
          <p>Không thể tải danh sách trường.</p>
          <button type="button" className="mt-2 underline" onClick={()=>void query.refetch()}>Thử lại</button>
        </div>}
        {query.isSuccess&&!searching&&schools.length===0&&<p className="p-3 text-sm text-muted-foreground">Không tìm thấy trường phù hợp.</p>}
        {schools.map((school,index)=><button key={school.id} id={'manager-allocation-school-'+school.id}
          type="button" role="option" aria-selected={value===String(school.id)}
          aria-label={'Chọn '+school.display_name+' · '+school.school_code}
          onMouseDown={event=>event.preventDefault()} onClick={()=>choose(school)}
          className={'flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-primary '+(index===active?'bg-primary/10':'hover:bg-muted')}>
          <span className="min-w-0 truncate"><span className="font-semibold">{school.display_name}</span><span className="ml-1 text-xs text-muted-foreground">· {school.school_code}</span></span>
        </button>)}
        <div className="flex items-center justify-between border-t border-border px-2 py-2 text-xs text-muted-foreground">
          <span>Trang {page}/{totalPages}</span>
          <span className="flex gap-2">
            <button type="button" disabled={page<=1||query.isPending||searching}
              onClick={()=>{setActive(0);setPage(p=>Math.max(1,p-1));}}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Trước</button>
            <button type="button" disabled={page>=totalPages||query.isPending||searching}
              onClick={()=>{setActive(0);setPage(p=>p+1);}}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Sau</button>
          </span>
        </div>
      </div>
    </PopoverContent>
  </Popover>;
}
