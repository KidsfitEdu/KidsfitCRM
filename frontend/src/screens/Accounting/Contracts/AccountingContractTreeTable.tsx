'use client';

import {useState} from 'react';
import {CheckCircle2, ChevronDown, ChevronRight, Eye, FilePenLine} from 'lucide-react';
import {AdminIconAction, adminTableClass, adminTableHeadClass} from '@/components/common/admin-list-ui';
import {AppStatusBadge} from '@/components/common/app-status-badge';
import type {AppStatusTone} from '@/components/common/app-status-badge';
import {Button} from '@/components/ui/button';
import {channelDate,channelMoney} from '@/lib/channel-operations';
import type {ContractRow} from './AccountingContractsPage';

type PeriodRow={
  key:string; renewalId:number|null; label:string; code:string;
  start:string|null;end:string|null;amount:number;status:string;
  action:string|null;
};


function periodPresentation(p:PeriodRow,today:string,soon:string):{label:string;tone:AppStatusTone}{
  const waiting=p.status==='PENDING_ACCOUNTING'||p.status==='NEEDS_INFO';
  const draft=p.status==='DRAFT';
  const rejected=p.status==='REJECTED'||p.status==='CANCELLED';
  const expired=!!p.end&&p.end<today;
  const upcoming=!!p.start&&p.start>today;
  const label=p.status==='PENDING_ACCOUNTING'?'Chờ Kế toán'
    :p.status==='NEEDS_INFO'?'Cần bổ sung'
    :p.status==='REJECTED'?'Đã từ chối'
    :p.status==='CANCELLED'?'Đã hủy'
    :draft?'Nháp'
    :!p.start||!p.end?'Cần rà soát kỳ'
    :upcoming?'Chưa bắt đầu':expired?'Đã kết thúc'
    :p.end<=soon?'Sắp hết hạn':'Đang sử dụng';
  const tone:AppStatusTone=waiting?'warning':rejected?'danger':draft||expired?'neutral':upcoming?'info':'success';
  return {label,tone};
}

function ContractActions({row,p,canConfirm,canRequestInfo,onView,onReview,onRequestInfo}:{
  row:ContractRow;p:PeriodRow;canConfirm:boolean;canRequestInfo:boolean;
  onView:(contractId:number,renewalId:number|null)=>void;
  onReview:(contractId:number,renewalId:number)=>void;
  onRequestInfo:(contractId:number,renewalId:number)=>void;
}){
  return <div className="flex flex-nowrap items-center justify-center gap-1">
    <AdminIconAction icon={Eye} label={'Xem '+p.label+' của '+row.school_name}
      onClick={()=>onView(row.id,p.renewalId)}/>
    {p.renewalId!==null&&p.status==='PENDING_ACCOUNTING'&&canConfirm&&
      <AdminIconAction icon={CheckCircle2} label={'Xác nhận '+p.label}
        onClick={()=>onReview(row.id,p.renewalId!)}/>}
    {p.renewalId!==null&&p.status==='PENDING_ACCOUNTING'&&canRequestInfo&&
      <AdminIconAction icon={FilePenLine} tone="blue"
        label={'Yêu cầu bổ sung '+p.label+' của '+row.school_name}
        onClick={()=>onRequestInfo(row.id,p.renewalId!)}/>}
  </div>;
}

export function AccountingContractTreeTable({rows,fromDate,toDate,needsAction,canConfirm,canRequestInfo,onView,onReview,onRequestInfo}:{
  rows:ContractRow[];fromDate:string;toDate:string;needsAction:boolean;canConfirm:boolean;canRequestInfo:boolean;
  onView:(contractId:number,renewalId:number|null)=>void;
  onReview:(contractId:number,renewalId:number)=>void;
  onRequestInfo:(contractId:number,renewalId:number)=>void;
}){
  const [collapsed,setCollapsed]=useState<Set<number>>(()=>new Set());
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const soon=new Date(Date.parse(today+'T00:00:00Z')+30*86400000).toISOString().slice(0,10);
  const display=rows.map(row=>{
    const contracts:PeriodRow[]=[
      {
        key:'original',renewalId:null,label:'Hợp đồng lần đầu',code:row.contract_code,
        start:row.source_service_start_on??null,end:row.source_service_end_on??null,
        amount:row.total_value,status:row.contract_status,
        action:row.action==='REVIEW_PERIOD'?'REVIEW_PERIOD':null
      },
      ...(row.periods??[]).map(p=>({
        key:'renewal-'+p.id,renewalId:p.id,label:'Tái ký lần '+p.renewal_no,
        code:p.contract_code??'Chưa cập nhật mã tái ký',
        start:p.service_start_on,end:p.service_end_on,amount:p.total_value,
        status:p.status,action:p.status==='PENDING_ACCOUNTING'?'CONFIRM_RENEWAL':
          p.status==='NEEDS_INFO'?'NEEDS_INFO':null
      }))
    ];
    return {row,contracts:contracts.filter(p=>
      (!needsAction||p.action!==null)
      &&(!fromDate||(!!p.end&&p.end>=fromDate))
      &&(!toDate||(!!p.start&&p.start<=toDate)))};
  }).filter(item=>item.contracts.length>0);

  return <div className="@container min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-2 text-xs text-muted-foreground">
      <span>Nhóm theo nhà trường · Mỗi lần ký có hồ sơ riêng</span>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={()=>setCollapsed(new Set())}>Mở tất cả</Button>
        <Button type="button" size="sm" variant="outline" onClick={()=>setCollapsed(new Set(display.map(x=>x.row.id)))}>Thu gọn tất cả</Button>
      </div>
    </div>
    <div className="hidden w-full min-w-0 @min-[1100px]:block">
      <table className={adminTableClass.replace('min-w-[760px]','min-w-0')+' crm-accounting-contract-table table-fixed'}>
        <colgroup>
          <col style={{width:'24%'}}/><col style={{width:'13%'}}/>
          <col style={{width:'17%'}}/><col style={{width:'13%'}}/>
          <col style={{width:'13%'}}/><col style={{width:'7%'}}/>
          <col style={{width:'13%'}}/>
        </colgroup>
        <thead className={adminTableHeadClass}>
          <tr>
            <th scope="col" className="px-4 py-3 whitespace-nowrap">Nhà trường</th>
            <th scope="col" className="px-3 py-3 whitespace-nowrap">Sales phụ trách</th>
            <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">Thời hạn</th>
            <th scope="col" className="px-3 py-3 text-right whitespace-nowrap">Giá trị hợp đồng</th>
            <th scope="col" className="px-3 py-3 whitespace-nowrap">Tình trạng</th>
            <th scope="col" className="px-3 py-3 whitespace-nowrap">Cần xử lý</th>
            <th scope="col" className="px-2 py-3 text-center whitespace-nowrap">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {display.map(({row,contracts})=><Group key={row.id} row={row} contracts={contracts}
            collapsed={collapsed.has(row.id)} toggle={()=>setCollapsed(current=>{
              const next=new Set(current);if(next.has(row.id))next.delete(row.id);else next.add(row.id);return next;
            })} today={today} soon={soon} canConfirm={canConfirm} canRequestInfo={canRequestInfo}
            onView={onView} onReview={onReview} onRequestInfo={onRequestInfo}/>)}
          {display.length===0&&<tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
            Không có hợp đồng phù hợp với bộ lọc.
          </td></tr>}
        </tbody>
      </table>
    </div>
    <div className="divide-y divide-border/70 @min-[1100px]:hidden">
      {display.map(({row,contracts})=><CompactGroup key={row.id}
        row={row} contracts={contracts} collapsed={collapsed.has(row.id)}
        toggle={()=>setCollapsed(current=>{
          const next=new Set(current);if(next.has(row.id))next.delete(row.id);else next.add(row.id);return next;
        })}
        today={today} soon={soon} canConfirm={canConfirm} canRequestInfo={canRequestInfo}
        onView={onView} onReview={onReview} onRequestInfo={onRequestInfo}/>)}
      {display.length===0&&<p className="px-4 py-10 text-center text-sm text-muted-foreground">
        Không có hợp đồng phù hợp với bộ lọc.
      </p>}
    </div>
  </div>;
}


/** No horizontal scrollbar on narrow accounting panels: the same contracts become stacked cards. */
function CompactGroup({row,contracts,collapsed,toggle,today,soon,canConfirm,canRequestInfo,onView,onReview,onRequestInfo}:{
  row:ContractRow;contracts:PeriodRow[];collapsed:boolean;toggle:()=>void;
  today:string;soon:string;canConfirm:boolean;canRequestInfo:boolean;
  onView:(contractId:number,renewalId:number|null)=>void;
  onReview:(contractId:number,renewalId:number)=>void;
  onRequestInfo:(contractId:number,renewalId:number)=>void;
}){
  const tasks=contracts.filter(p=>p.action).length;
  return <section className="min-w-0">
    <button type="button" onClick={toggle} aria-expanded={!collapsed}
      aria-label={(collapsed?'Mở':'Thu gọn')+' hợp đồng của '+row.school_name}
      className="flex w-full items-center gap-2 border-b border-border/70 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-ring">
      {collapsed?<ChevronRight className="size-4 shrink-0 text-primary"/>:<ChevronDown className="size-4 shrink-0 text-primary"/>}
      <span className="min-w-0 flex-1 break-words font-bold">{row.school_name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{contracts.length} hợp đồng</span>
      {tasks>0&&<span className="rounded-full border border-amber-300/60 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-200">
        {tasks} cần xử lý
      </span>}
    </button>
    {!collapsed&&<div className="divide-y divide-border/70">
      {contracts.map(p=>{
        const {label,tone}=periodPresentation(p,today,soon);
        return <article key={p.key} className="min-w-0 space-y-3 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold">{row.school_name}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{p.label} · {p.code}</p>
            </div>
            <AppStatusBadge status={p.status} label={label} tone={tone} size="sm"/>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div className="min-w-0"><dt className="text-muted-foreground">Sales phụ trách</dt>
              <dd className="mt-1 break-words font-medium">{row.owner_name}</dd></div>
            <div className="min-w-0"><dt className="text-muted-foreground">Giá trị hợp đồng</dt>
              <dd className="mt-1 font-semibold tabular-nums">{channelMoney(p.amount)}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Thời hạn</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {p.start&&p.end?channelDate(p.start)+' – '+channelDate(p.end):'Chưa cập nhật'}
              </dd></div>
            {p.action&&<div className="col-span-2"><dt className="text-muted-foreground">Cần xử lý</dt>
              <dd className="mt-1 font-medium">{p.action==='CONFIRM_RENEWAL'?'Xác nhận tái ký':
                p.action==='NEEDS_INFO'?'Chờ Sales bổ sung':'Kiểm tra kỳ sử dụng'}</dd></div>}
          </dl>
          <div className="flex justify-end border-t border-border/50 pt-2">
            <ContractActions row={row} p={p} canConfirm={canConfirm} canRequestInfo={canRequestInfo}
              onView={onView} onReview={onReview} onRequestInfo={onRequestInfo}/>
          </div>
        </article>;
      })}
    </div>}
  </section>;
}

function Group({row,contracts,collapsed,toggle,today,soon,canConfirm,canRequestInfo,onView,onReview,onRequestInfo}:{
  row:ContractRow;contracts:PeriodRow[];collapsed:boolean;toggle:()=>void;
  today:string;soon:string;canConfirm:boolean;canRequestInfo:boolean;
  onView:(contractId:number,renewalId:number|null)=>void;
  onReview:(contractId:number,renewalId:number)=>void;
  onRequestInfo:(contractId:number,renewalId:number)=>void;
}){
  const tasks=contracts.filter(p=>p.action).length;
  return <>
    <tr className="border-t-2 border-border bg-background transition-colors hover:bg-muted/20">
      <td colSpan={7} className="px-4 py-3">
        <button type="button" className="flex w-full items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
          aria-expanded={!collapsed} aria-label={(collapsed?'Mở':'Thu gọn')+' hợp đồng của '+row.school_name} onClick={toggle}>
          {collapsed?<ChevronRight className="size-4 shrink-0 text-primary"/>:<ChevronDown className="size-4 shrink-0 text-primary"/>}
          <span className="min-w-0 flex-1 truncate font-bold" title={row.school_name}>{row.school_name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{contracts.length} hợp đồng</span>
          {tasks>0&&<span className="shrink-0 rounded-full border border-amber-300/50 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">{tasks} cần xử lý</span>}
        </button>
      </td>
    </tr>
    {!collapsed&&contracts.map(p=>{
      const {label,tone}=periodPresentation(p,today,soon);
      return <tr key={p.key} className="bg-background transition-colors hover:bg-muted/20">
        <td className="crm-contract-school-cell min-w-0 py-3 pl-9 pr-2">
          <p className="break-words font-semibold" title={row.school_name}>{row.school_name}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{p.label} · {p.code}</p>
        </td>
        <td className="px-3 py-3">
          <p className="font-medium">{row.owner_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.personnel_type==='COLLABORATOR'?'CTV':'Nhân viên'}</p>
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-right text-[13px] font-semibold tabular-nums">
          {p.start&&p.end?<span>{channelDate(p.start)} – {channelDate(p.end)}</span>:<span className="text-muted-foreground">Chưa cập nhật</span>}
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-right font-semibold tabular-nums">{channelMoney(p.amount)}</td>
        <td className="px-3 py-3">
          <AppStatusBadge status={p.status} label={label} tone={tone} size="sm" className="whitespace-nowrap"/>
        </td>
        <td className="px-3 py-3 text-xs">
          {p.action==='CONFIRM_RENEWAL'?<span className="font-semibold text-amber-800 dark:text-amber-200">Xác nhận tái ký</span>
            :p.action==='NEEDS_INFO'?<span className="text-amber-800 dark:text-amber-200">Chờ Sales bổ sung</span>
            :p.action==='REVIEW_PERIOD'?<span className="text-amber-800 dark:text-amber-200">Kiểm tra kỳ sử dụng</span>
            :<span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-1 py-3 text-center">
          <ContractActions row={row} p={p} canConfirm={canConfirm} canRequestInfo={canRequestInfo}
            onView={onView} onReview={onReview} onRequestInfo={onRequestInfo}/>
        </td>
      </tr>;
    })}
  </>;
}
