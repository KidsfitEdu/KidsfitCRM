'use client';

import {channelDate} from '@/lib/channel-operations';

export type SupportTimelineEntry={
  id:number;content:string;created_at:string;
  activity_type?:string;author_name?:string|null;author_role?:string|null;
};

export function SupportTicketSummary({subject,description,statusLabel}:{
  subject:string;description:string;statusLabel:string;
}){
  return <div className="space-y-3 text-sm">
    <div className="rounded-xl border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">Trạng thái xử lý</p>
      <p className="mt-1 font-semibold">{statusLabel}</p>
    </div>
    <section className="space-y-2">
      <h3 className="font-semibold">Thông tin lỗi</h3>
      <p className="font-medium break-words">{subject}</p>
      <p className="whitespace-pre-wrap break-words text-muted-foreground">{description}</p>
    </section>
  </div>;
}

export function SupportTicketTimeline({entries,emptyText='Chưa có lịch sử xử lý.'}:{
  entries:SupportTimelineEntry[];emptyText?:string;
}){
  return <section className="space-y-3 text-sm">
    <h3 className="font-semibold">Lịch sử xử lý</h3>
    {entries.length===0&&<p className="text-muted-foreground">{emptyText}</p>}
    <ol className="space-y-3 border-l-2 border-emerald-200 pl-4">
      {entries.map(a=><li key={a.id} className="relative rounded-xl border p-3">
        <span aria-hidden="true" className="absolute -left-[22px] top-4 size-2 rounded-full bg-emerald-600"/>
        <p className="text-xs font-semibold">{a.author_role??(a.activity_type==='CHECKEE_SUPPORT'?'CHECKEE':'CSKH')}
          {a.author_name?' · '+a.author_name:''}</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{a.content}</p>
        <p className="mt-2 text-xs text-muted-foreground">{channelDate(a.created_at)}</p>
      </li>)}
    </ol>
  </section>;
}
