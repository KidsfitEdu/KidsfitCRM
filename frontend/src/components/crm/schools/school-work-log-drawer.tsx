'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronDown, ChevronUp, History, MessageSquareText, Phone, UsersRound } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppWorkNoteContent } from '@/components/common/forms/app-work-note';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelQueryKeys, channelRequest } from '@/lib/channel-operations';

type WorkLog = {
  id: number;
  activity_type: string;
  content: string;
  created_at: string;
  occurred_at?: string | null;
  contact_name?: string | null;
  contact_position?: string | null;
  feedback?: string | null;
  outcome?: string | null;
  evidence_reference?: string | null;
  commitment?: string | null;
  user_name: string;
};
type Assignment = {
  id: number; registered_at: string; protected_until: string;
  status: string; user_name: string;
};
type Response = {
  data: WorkLog[]; total: number; page: number; page_size: number;
  assignments: Assignment[]; assignment_total: number; assignment_page: number;
};
const PAGE_SIZE = 20;
const typeNames: Record<string,string> = {
  CALL:'Gọi điện', MEETING:'Gặp trực tiếp', ZALO:'Zalo',
  DEMO:'Giới thiệu sản phẩm', NOTE:'Ghi chú', PROPOSAL:'Gửi đề xuất / báo giá',
};
const outcomeNames: Record<string,string> = {
  INTERESTED:'Quan tâm sản phẩm', NEEDS_INFO:'Cần tư vấn thêm',
  DEMO_SCHEDULED:'Đã hẹn giới thiệu', WAITING:'Chờ phản hồi',
  DECLINED:'Không có nhu cầu', UNREACHABLE:'Không liên hệ được',
};
const registrationNames: Record<string,string> = {
  ACTIVE:'Đang tiếp cận', CONVERTED:'Đã ký hợp đồng', EXPIRED:'Đã hết hạn',
  RELEASED:'Đã trả trường', CANCELLED:'Đã hủy', COMPLETED:'Đã hoàn tất',
  PENDING:'Chờ xử lý', REJECTED:'Đã từ chối', WITHDRAWN:'Đã rút',
};
const dateFormatter = new Intl.DateTimeFormat('vi-VN',{
  timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('vi-VN',{
  timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
});
const fullFormatter = new Intl.DateTimeFormat('vi-VN',{
  timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23',
});
const dayOf=(value:string)=>dateFormatter.format(new Date(value));
const timeOf=(value:string)=>timeFormatter.format(new Date(value));
const fullDate=(value:string)=>fullFormatter.format(new Date(value));
const pagesFor=(total:number)=>Math.max(1,Math.ceil(total/PAGE_SIZE));

function JournalEntry({log}:{log:WorkLog}) {
  const [expanded,setExpanded]=useState(false);
  const longContent=log.content.length>190;
  const occurred=log.occurred_at ?? log.created_at;
  return <li className="relative flex gap-3 pb-4 last:pb-0">
    <div aria-hidden="true" className="relative flex w-7 shrink-0 justify-center pt-4">
      <div className="absolute bottom-0 left-1/2 top-4 w-px -translate-x-1/2 bg-border last:hidden"/>
      <div className="relative z-10 size-2.5 rounded-full bg-primary ring-4 ring-background"/>
    </div>
    <article className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          {log.activity_type==='CALL'
            ? <Phone aria-hidden="true" className="size-4 shrink-0 text-primary"/>
            : <MessageSquareText aria-hidden="true" className="size-4 shrink-0 text-primary"/>}
          <h4 className="text-sm font-semibold text-foreground">{typeNames[log.activity_type]??'Hoạt động liên hệ'}</h4>
        </div>
        <time dateTime={occurred} className="text-xs tabular-nums text-muted-foreground">{timeOf(occurred)}</time>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Ghi nhận bởi: {log.user_name}</p>
      {log.occurred_at && dayOf(log.occurred_at)!==dayOf(log.created_at)
        && <p className="mt-1 text-xs text-muted-foreground">Ghi nhận vào {fullDate(log.created_at)}</p>}
      {(log.contact_name||log.contact_position)&&<p className="mt-2 text-xs text-muted-foreground">
        Trao đổi với: {[log.contact_name,log.contact_position].filter(Boolean).join(' · ')}
      </p>}
      <div className="mt-2 min-w-0 break-words text-sm leading-relaxed text-foreground">
        <div className={!expanded&&longContent?'line-clamp-4':''}>
          <AppWorkNoteContent content={log.content} compact/>
        </div>
        {longContent&&<button type="button" aria-expanded={expanded}
          className="mt-1 inline-flex min-h-8 items-center gap-1 rounded-md text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={()=>setExpanded(x=>!x)}>
          {expanded?'Thu gọn':'Xem thêm'}
          {expanded?<ChevronUp aria-hidden="true" className="size-3"/>:<ChevronDown aria-hidden="true" className="size-3"/>}
        </button>}
      </div>
      {log.outcome&&<p className="mt-2 text-xs"><span className="text-muted-foreground">Kết quả: </span>{outcomeNames[log.outcome]??'Đã ghi nhận kết quả'}</p>}
      {log.feedback&&<p className="mt-2 break-words text-xs"><span className="text-muted-foreground">Phản hồi: </span>{log.feedback}</p>}
      {log.commitment&&<p className="mt-2 break-words text-xs"><span className="text-muted-foreground">Cam kết: </span>{log.commitment}</p>}
      {log.evidence_reference&&<p className="mt-2 break-all text-xs"><span className="text-muted-foreground">Tham chiếu minh chứng: </span>{log.evidence_reference}</p>}
    </article>
  </li>;
}

/** Shared read-only journal for Sales and Managers. The API scopes each page. */
export function SchoolWorkLogDrawer({open,onOpenChange,customerId,schoolName,apiBase,token}:{
  open:boolean;
  onOpenChange:(open:boolean)=>void;
  customerId:number|null;
  schoolName:string;
  apiBase:string;
  token:string;
}) {
  const [page,setPage]=useState(1);
  const [assignmentPage,setAssignmentPage]=useState(1);
  const [rightsExpanded,setRightsExpanded]=useState(false);
  useEffect(()=>{
    setPage(1);setAssignmentPage(1);setRightsExpanded(false);
  },[customerId]);
  const logs=useQuery({
    queryKey:[...channelQueryKeys.all,'school-work-logs',apiBase,customerId,page,assignmentPage],
    queryFn:()=>channelRequest<Response>(apiBase,token,
      `/customers/${customerId}/work-logs?page=${page}&pageSize=${PAGE_SIZE}&assignmentPage=${assignmentPage}`),
    enabled:open&&customerId!==null&&!!token,
  });
  const close=(next:boolean)=>{
    if(!next){setPage(1);setAssignmentPage(1);setRightsExpanded(false);}
    onOpenChange(next);
  };
  const total=logs.data?.total??0;
  const rightsTotal=logs.data?.assignment_total??logs.data?.assignments.length??0;
  const pages=pagesFor(total);
  const rightsPages=pagesFor(rightsTotal);
  const entries=logs.data?.data??[];
  const grouped: {date:string;items:WorkLog[]}[]=[];
  for(const log of entries){
    const date=dayOf(log.occurred_at??log.created_at);
    const last=grouped[grouped.length-1];
    if(last?.date===date)last.items.push(log);
    else grouped.push({date,items:[log]});
  }
  return <AppDrawer open={open} onOpenChange={close} title="Nhật ký làm việc" description={schoolName}>
    <div className="space-y-4">
      {logs.isPending&&<output className="block rounded-xl border border-border p-4 text-sm text-muted-foreground">Đang tải nhật ký làm việc…</output>}
      {logs.error&&<div role="alert" className="space-y-2 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
        <p>{logs.error instanceof Error?logs.error.message:'Không tải được nhật ký làm việc.'}</p>
        <AppButton tone="neutral" type="button" onClick={()=>void logs.refetch()}>Thử lại</AppButton>
      </div>}
      {logs.data&&<>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground">Lịch sử làm việc</h3>
          <span className="text-xs tabular-nums text-muted-foreground">{total} hoạt động</span>
        </div>
        {entries.length===0&&!logs.isFetching
          ?<div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <MessageSquareText aria-hidden="true" className="mx-auto mb-2 size-6 text-muted-foreground"/>
            <p className="text-sm text-muted-foreground">Chưa có nhật ký làm việc nào.</p>
          </div>
          :<div className="space-y-4" aria-busy={logs.isFetching}>
            {grouped.map(group=><section key={group.date} aria-label={'Ngày '+group.date} className="space-y-2">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <CalendarDays aria-hidden="true" className="size-4"/>
                {group.date}<span aria-hidden="true" className="h-px flex-1 bg-border"/>
              </h4>
              <ol className="space-y-0">{group.items.map(log=><JournalEntry key={log.id} log={log}/>)}</ol>
            </section>)}
          </div>}
        {total>PAGE_SIZE&&<nav aria-label="Phân trang nhật ký làm việc"
          className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-xs tabular-nums text-muted-foreground">Trang {page}/{pages}</span>
          <div className="flex gap-2">
            <AppButton tone="neutral" type="button" disabled={page<=1||logs.isFetching}
              onClick={()=>setPage(x=>Math.max(1,x-1))}>Trước</AppButton>
            <AppButton tone="neutral" type="button" disabled={page>=pages||logs.isFetching}
              onClick={()=>setPage(x=>Math.min(pages,x+1))}>Tiếp</AppButton>
          </div>
        </nav>}
        {rightsTotal>0&&<section className="border-t border-border pt-4">
          <button type="button" aria-expanded={rightsExpanded} aria-controls="school-work-log-rights"
            onClick={()=>setRightsExpanded(x=>!x)}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 text-left hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <History aria-hidden="true" className="size-4 shrink-0 text-primary"/>
            <span className="min-w-0 flex-1 text-sm font-semibold">Lịch sử quyền tiếp cận</span>
            <span className="text-xs tabular-nums text-muted-foreground">{rightsTotal} lượt</span>
            {rightsExpanded?<ChevronUp aria-hidden="true" className="size-4"/>:<ChevronDown aria-hidden="true" className="size-4"/>}
          </button>
          {rightsExpanded&&<div id="school-work-log-rights" className="mt-3 space-y-3">
            <ol className="space-y-2">
              {logs.data.assignments.map(assignment=><li key={assignment.id}
                className="rounded-xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold"><UsersRound aria-hidden="true" className="size-4 text-primary"/>{assignment.user_name}</span>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {registrationNames[assignment.status]??'Đã ghi nhận'}
                  </span>
                </div>
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                  {fullDate(assignment.registered_at)} – {fullDate(assignment.protected_until)}
                </p>
              </li>)}
            </ol>
            {rightsTotal>PAGE_SIZE&&<nav aria-label="Phân trang lịch sử quyền tiếp cận"
              className="flex items-center justify-between gap-2 border-t border-border pt-3">
              <span className="text-xs tabular-nums text-muted-foreground">Trang {assignmentPage}/{rightsPages}</span>
              <div className="flex gap-2">
                <AppButton type="button" tone="neutral" disabled={assignmentPage<=1||logs.isFetching}
                  onClick={()=>setAssignmentPage(x=>Math.max(1,x-1))}>Trước</AppButton>
                <AppButton type="button" tone="neutral" disabled={assignmentPage>=rightsPages||logs.isFetching}
                  onClick={()=>setAssignmentPage(x=>Math.min(rightsPages,x+1))}>Tiếp</AppButton>
              </div>
            </nav>}
          </div>}
        </section>}
      </>}
    </div>
  </AppDrawer>;
}
