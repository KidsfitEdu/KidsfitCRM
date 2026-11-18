'use client';

import {useState} from 'react';
import {ChevronDown, Search} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {channelMoney} from '@/lib/channel-operations';

export type ReceivableContract={
  id:number;code:string;school_name:string;amount_remaining:number;
  owner_name:string;personnel_type:string|null;manager_name:string|null;
};

type Props={
  selected:ReceivableContract|null;
  options:ReceivableContract[];
  query:string;onQueryChange:(query:string)=>void;
  open:boolean;onOpenChange:(open:boolean)=>void;
  loading:boolean;total:number;page:number;
  onPageChange:(page:number)=>void;
  onSelect:(contract:ReceivableContract)=>void;
  disabled?:boolean;
};

/**
 * Search directly in the receipt form. The portal keeps suggestions out of
 * AppDialog's scrolling body so the selector does not expand or clip the modal.
 * Results are server-scoped and paginated; no client-side fake school data.
 */
export function AccountingReceivablePicker({
  selected,options,query,onQueryChange,open,onOpenChange,loading,total,page,
  onPageChange,onSelect,disabled=false,
}:Props){
  const [active,setActive]=useState(0);
  const choose=(item:ReceivableContract)=>{
    if(disabled||loading)return;
    onSelect(item);
    onOpenChange(false);
    onQueryChange('');
    setActive(0);
  };
  const setSearch=(value:string)=>{
    onQueryChange(value);
    setActive(0);
  };
  const showSelected=!open&&selected!==null;
  return <Popover open={open} onOpenChange={next=>{
    if(disabled)return;
    onOpenChange(next);
    if(next){onQueryChange('');setActive(0);}
  }}>
    <div className="relative min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
      <PopoverTrigger render={
        <Input id="receivable-contract-search" type="search" autoComplete="off" disabled={disabled}
          aria-label="Tìm và chọn nhà trường hoặc mã hợp đồng còn phải thu"
          aria-controls={open?'receivable-contract-options':undefined}
          aria-expanded={open}
          aria-activedescendant={open&&!loading&&options[active]?'receivable-option-'+options[active].id:undefined}
          value={showSelected?selected.school_name+' · '+selected.code:query}
          placeholder="Tìm tên trường hoặc mã hợp đồng..."
          className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-9 text-sm shadow-xs focus-visible:border-primary"
          onFocus={()=>{if(!open&&!disabled){setSearch('');onOpenChange(true);}}}
          onChange={e=>{if(!open)onOpenChange(true);setSearch(e.currentTarget.value);}}
          onKeyDown={e=>{
            if(e.key==='ArrowDown'){
              e.preventDefault();
              if(!open){onOpenChange(true);return;}
              setActive(i=>Math.min(i+1,Math.max(0,options.length-1)));
            }else if(e.key==='ArrowUp'&&open){
              e.preventDefault();setActive(i=>Math.max(0,i-1));
            }else if(e.key==='Enter'&&open){
              e.preventDefault();if(options[active])choose(options[active]);
            }else if(e.key==='Escape'&&open){
              e.preventDefault();e.stopPropagation();onOpenChange(false);
            }
          }}/>
      }/>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
    </div>
    <PopoverContent align="start" side="bottom" sideOffset={5}
      className="z-[90] w-[min(var(--anchor-width),calc(100vw-24px))] max-h-[min(288px,45dvh)] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
      <div id="receivable-contract-options" aria-label="Hợp đồng còn phải thu" className="space-y-1">
        {loading
          ?<output className="block p-3 text-sm text-muted-foreground">Đang tìm hợp đồng...</output>
          :options.length===0
            ?<p className="p-3 text-sm text-muted-foreground">Không có hợp đồng còn phải thu phù hợp.</p>
            :options.map((item,index)=><button key={item.id} id={'receivable-option-'+item.id}
              type="button" onClick={()=>choose(item)} disabled={disabled}
              className={'flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring '+(index===active?'bg-primary/10':'hover:bg-muted/60')}>
              <span className="min-w-0">
                <span className="block break-words font-semibold">{item.school_name}</span>
                <span className="block text-xs text-muted-foreground">{item.code}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold tabular-nums text-primary">{channelMoney(item.amount_remaining)}</span>
            </button>)}
        {total>50&&<div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2 text-xs text-muted-foreground">
          <span>Trang {page}/{Math.ceil(total/50)}</span>
          <div className="flex gap-1.5">
            <Button type="button" size="sm" variant="outline" disabled={loading||page<=1}
              onClick={()=>{setActive(0);onPageChange(page-1);}}>Trước</Button>
            <Button type="button" size="sm" variant="outline" disabled={loading||page*50>=total}
              onClick={()=>{setActive(0);onPageChange(page+1);}}>Sau</Button>
          </div>
        </div>}
      </div>
    </PopoverContent>
  </Popover>;
}
