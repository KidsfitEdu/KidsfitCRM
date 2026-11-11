'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppWorkNoteContent } from '@/components/common/forms/app-work-note';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppSelect } from '@/components/common/app-select';
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
type Response = { data: WorkLog[]; total: number; page: number; page_size: number;
  assignments:{id:number;registered_at:string;protected_until:string;status:string;user_name:string}[] };
const outcomeNames:Record<string,string>={INTERESTED:'Quan tâm sản phẩm',NEEDS_INFO:'Cần tư vấn thêm',DEMO_SCHEDULED:'Đã hẹn demo',WAITING:'Chờ phản hồi',DECLINED:'Không có nhu cầu',UNREACHABLE:'Không liên hệ được'};
const typeNames: Record<string, string> = {
  CALL: 'Gọi điện', MEETING: 'Gặp trực tiếp', ZALO: 'Zalo',
  DEMO: 'Demo', NOTE: 'Ghi chú', PROPOSAL:'Gửi đề xuất / báo giá',
};
const PAGE_SIZE = 20;
const vietnamDateTime = (date: string) =>
  new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(date));

/** School contact notes; distinct from technical audit history. Backend authorizes every page. */
export function SchoolWorkLogDrawer({
  open, onOpenChange, customerId, schoolName, apiBase, token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  schoolName: string;
  apiBase: string;
  token: string;
}) {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const logs = useQuery({
    queryKey: [...channelQueryKeys.all,'school-work-logs',customerId,page,type],
    queryFn: ()=>channelRequest<Response>(apiBase,token,
      `/customers/${customerId}/work-logs?page=${page}&pageSize=${PAGE_SIZE}${type ? '&type='+encodeURIComponent(type) : ''}`),
    enabled: open && customerId !== null && !!token,
  });
  const close = (next: boolean) => {
    if (!next) { setPage(1); setType(''); }
    onOpenChange(next);
  };
  const pages = Math.max(1,Math.ceil((logs.data?.total ?? 0)/PAGE_SIZE));
  return <AppDrawer open={open} onOpenChange={close} title="Nhật ký làm việc" description={schoolName}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{logs.data ? `${logs.data.total} lần làm việc được ghi nhận` : 'Hoạt động liên hệ với nhà trường'}</p>
        <AppSelect ariaLabel="Lọc kênh liên hệ" value={type} size="compact" className="w-40"
          options={[{value:'',label:'Tất cả kênh'},
            ...Object.entries(typeNames).map(([value,label])=>({value,label}))]}
          onValueChange={next=>{setType(next);setPage(1);}}/>
      </div>
      {logs.isPending && <output className="text-sm text-muted-foreground">Đang tải ghi chú…</output>}
      {logs.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{logs.error instanceof Error ? logs.error.message : 'Không tải được lịch sử.'}</p>}
      {logs.data?.data.length === 0 && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Chưa có lần làm việc nào phù hợp.</p>}
      {logs.data?.assignments && logs.data.assignments.length>0 && <section className="space-y-2 rounded-xl border p-3">
        <h3 className="font-semibold">Lịch sử các lượt tiếp cận</h3>
        <p className="text-xs text-muted-foreground">Mỗi lượt thuộc nhân sự và thời hạn riêng; dữ liệu chỉ hiển thị trong phạm vi được cấp.</p>
        {logs.data.assignments.map(a=><div key={a.id} className="flex flex-wrap justify-between gap-2 border-t pt-2 text-xs">
          <span>{a.user_name} · {a.status}</span>
          <span>{vietnamDateTime(a.registered_at)} – {vietnamDateTime(a.protected_until)}</span>
        </div>)}
      </section>}
      <ol className="space-y-3">
        {logs.data?.data.map(log=><li key={log.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="text-xs font-semibold text-[#1b5e20]">{typeNames[log.activity_type] ?? log.activity_type}</span>
            <time dateTime={log.created_at} className="text-xs tabular-nums text-muted-foreground">{vietnamDateTime(log.created_at)}</time>
          </div>
          <p className="mt-1 mb-2 text-xs text-muted-foreground">Ghi nhận bởi: {log.user_name}</p>
          {log.occurred_at && <p className="mb-2 text-xs text-muted-foreground">Làm việc lúc: {vietnamDateTime(log.occurred_at)}</p>}
          {(log.contact_name || log.contact_position) && <p className="mb-2 text-xs text-muted-foreground">
            Trao đổi với: {[log.contact_name,log.contact_position].filter(Boolean).join(' · ')}
          </p>}
          <AppWorkNoteContent content={log.content} compact/>
          {log.outcome && <p className="mt-2 text-sm"><strong>Kết quả:</strong> {outcomeNames[log.outcome]??log.outcome}</p>}
          {log.feedback && <p className="mt-2 text-sm"><strong>Phản hồi:</strong> {log.feedback}</p>}
          {log.commitment && <p className="mt-2 text-sm"><strong>Cam kết:</strong> {log.commitment}</p>}
          {log.evidence_reference && <p className="mt-2 break-words text-xs text-muted-foreground"><strong>Tham chiếu minh chứng:</strong> {log.evidence_reference}</p>}
        </li>)}
      </ol>
      {logs.data && logs.data.total > PAGE_SIZE && <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">Trang {page}/{pages}</span>
        <div className="flex gap-2">
          <AppButton tone="neutral" type="button" disabled={page<=1 || logs.isFetching} onClick={()=>setPage(x=>Math.max(1,x-1))}>Trước</AppButton>
          <AppButton tone="neutral" type="button" disabled={page>=pages || logs.isFetching} onClick={()=>setPage(x=>Math.min(pages,x+1))}>Tiếp</AppButton>
        </div>
      </div>}
    </div>
  </AppDrawer>;
}
