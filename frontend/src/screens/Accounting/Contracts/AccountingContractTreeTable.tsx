'use client';

import {useState} from 'react';
import {CheckCircle2, ChevronDown, ChevronRight, Eye} from 'lucide-react';
import {AdminIconAction, adminTableClass, adminTableHeadClass} from '@/components/common/admin-list-ui';
import {AppStatusBadge} from '@/components/common/app-status-badge';
import {Button} from '@/components/ui/button';
import {channelDate,channelMoney} from '@/lib/channel-operations';
import type {ContractRow} from './AccountingContractsPage';

type PeriodRow={
  key:string; renewalId:number|null; label:string; code:string;
  start:string|null;end:string|null;amount:number;status:string;
  action:string|null;
};

export function AccountingContractTreeTable({rows,fromDate,toDate,needsAction,canConfirm,onView,onReview}:{
  rows:ContractRow[];fromDate:string;toDate:string;needsAction:boolean;canConfirm:boolean;
  onView:(contractId:number,renewalId:number|null)=>void;
  onReview:(contractId:number,renewalId:number)=>void;
}){
  const [collapsed,setCollapsed]=useState<Set<number>>(()=>new Set());
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const soon=new Date(Date.parse(today+'T00:00:00Z')+30*86400000).toISOString().slice(0,10);
  const display=rows.map(row=>{
    const contracts:PeriodRow[]=[
      ...[{
        key:'original',renewalId:null,label:'Hợp đồng lần đầu',code:row.contract_code,
        start:row.source_service_start_on??null,end:row.source_service_end_on??null,
        amount:row.total_value,status:row.contract_status,
        action:row.action==='REVIEW_PERIOD'?'REVIEW_PERIOD':null
      }],
      ...(row.periods??[]).map(p=>({
        key:'renewal-'+p.id,renewalId:p.id,label:'Tái ký lần '+p.renewal_no,
        code:p.contract_code??'Chưa cập nhật mã tái ký',
        start:p.service_start_on,end:p.service_end_on,amount:p.total_value,
        status:p.status,action:p.status==='PENDING_ACCOUNTING'?'CONFIRM_RENEWAL':
          p.status==='NEEDS_INFO'?'NEEDS_INFO':null
      })))
    ];
    return {row,contracts:contracts.filter(p=>
      (!needsAction||p.action!==null)
      &&(!fromDate||(!!p.end&&p.end>=fromDate))
      &&(!toDate||(!!p.start&&p.start<=toDate)))};
  }).filter(item=>item.contracts.length>0);

  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-2 text-xs text-muted-foreground">
      <span>Nhóm theo nhà trường · Mỗi lần ký có hồ sơ riêng</span>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={()=>setCollapsed(new Set())}>Mở tất cả</Button>
        <Button type="button" size="sm" variant="outline" onClick={()=>setCollapsed(new Set(display.map(x=>x.row.id)))}>Thu gọn tất cả</Button>
      </div>
    </div>
    <div className="w-full overflow-x-auto">
      <table className={adminTableClass+' min-w-[1050px] table-fixed'}>
        <thead className={adminTableHeadClass}>
          <tr>
            <th scope="col" className="w-[25%] px-4 py-3">Nhà trường</th>
            <th scope="col" className="w-[13%] px-3 py-3">Sales phụ trách</th>
            <th scope="col" className="w-[15%] px-3 py-3">Thời hạn</th>
            <th scope="col" className="w-[13%] px-3 py-3 text-right">Giá trị hợp đồng</th>
            <th scope="col" className="w-[13%] px-3 py-3">Tình trạng</th>
            <th scope="col" className="w-[13%] px-3 py-3">Cần xử lý</th>
            <th scope="col" className="w-[8%] px-2 py-3 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {display.map(({row,contracts})=><Group key={row.id} row={row} contracts={contracts}
            collapsed={collapsed.has(row.id)} toggle={()=>setCollapsed(current=>{
              const next=new Set(current);if(next.has(row.id))next.delete(row.id);else next.add(row.id);return next;
            })} today={today} soon={soon} canConfirm={canConfirm} onView={onView} onReview={onReview}/>)}
          {display.length===0&&<tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
            Không có hợp đồng phù hợp với bộ lọc.
          </td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}

function Group({row,contracts,collapsed,toggle,today,soon,canConfirm,onView,onReview}:{
  row:ContractRow;contracts:PeriodRow[];collapsed:boolean;toggle:()=>void;
  today:string;soon:string;canConfirm:boolean;
  onView:(contractId:number,renewalId:number|null)=>void;
  onReview:(contractId:number,renewalId:number)=>void;
}){
  const tasks=contracts.filter(p=>p.action).length;
  return <>
    <tr className="bg-emerald-50/85 text-emerald-950 transition-colors hover:bg-emerald-100/80 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:bg-emerald-900/45">
      <td colSpan={7} className="px-4 py-2">
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
      return <tr key={p.key} className="transition-colors even:bg-muted/10 hover:bg-muted/40">
        <td className="min-w-0 py-3 pl-9 pr-3">
          <p className="break-words font-semibold" title={row.school_name}>{row.school_name}</p>
          <p className="mt-1 break-all text-xs text-muted-foreground">{p.label} · {p.code}</p>
        </td>
        <td className="px-3 py-3">
          <p className="font-medium">{row.owner_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.personnel_type==='COLLABORATOR'?'CTV':'Nhân viên'}</p>
        </td>
        <td className="px-3 py-3 text-xs tabular-nums">
          {p.start&&p.end?<>{channelDate(p.start)}<p className="mt-1 text-muted-foreground">đến {channelDate(p.end)}</p></>:<span className="text-muted-foreground">Chưa cập nhật</span>}
        </td>
        <td className="px-3 py-3 text-right font-semibold tabular-nums">{channelMoney(p.amount)}</td>
        <td className="px-3 py-3">
          <AppStatusBadge status={p.status} label={label}
            tone={waiting?'warning':rejected?'danger':draft||expired?'neutral':upcoming?'info':'success'} size="sm"/>
        </td>
        <td className="px-3 py-3 text-xs">
          {p.action==='CONFIRM_RENEWAL'?<span className="font-semibold text-amber-800 dark:text-amber-200">Xác nhận tái ký</span>
            :p.action==='NEEDS_INFO'?<span className="text-amber-800 dark:text-amber-200">Chờ Sales bổ sung</span>
            :p.action==='REVIEW_PERIOD'?<span className="text-amber-800 dark:text-amber-200">Kiểm tra kỳ sử dụng</span>
            :<span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-2 py-3 text-center">
          <div className="flex justify-center gap-1">
            <AdminIconAction icon={Eye} label={'Xem '+p.label+' của '+row.school_name}
              onClick={()=>onView(row.id,p.renewalId)}/>
            {p.renewalId!==null&&p.status==='PENDING_ACCOUNTING'&&canConfirm&&
              <AdminIconAction icon={CheckCircle2} label={'Xác nhận '+p.label}
                onClick={()=>onReview(row.id,p.renewalId!)}/>}
          </div>
        </td>
      </tr>;
    })}
  </>;
}
