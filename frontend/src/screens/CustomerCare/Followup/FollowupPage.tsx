'use client';

import {useQuery} from '@tanstack/react-query';
import {AppPageHeader} from '@/components/common/app-page-header';
import {channelRequest, channelDate} from '@/lib/channel-operations';
import type {SchoolOperationsWorkspace} from '@/lib/school-operations';
import type {RolePageProps} from '@/types/role-pages';

export function FollowupPage({apiBase,token,abilities,onSalesNavigate}:RolePageProps) {
  const allowed=!apiBase||abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const query=useQuery({
    queryKey:['care-followups',token],
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1'),
    enabled:!!apiBase&&!!token&&allowed,
  });
  const rows=(query.data?.support_cases??[]).filter(x=>x.status!=='RESOLVED')
    .flatMap(c=>c.activities.filter(a=>!!a.next_follow_up_at).map(a=>({
      key:c.id+'-'+a.id,subject:c.subject,school:c.customer_name,
      date:a.next_follow_up_at!,note:a.content,
    }))).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  if(!allowed)return <p role="alert">Không có quyền theo dõi chăm sóc.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Theo dõi chăm sóc"
      description="Lịch hẹn từ các hoạt động hỗ trợ đang mở. Ghi nhận kết quả và đặt lịch kế tiếp trong chi tiết ticket."/>
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Kết nối Backend để xem lịch chăm sóc.</p>}
    {query.error&&<p role="alert" className="rounded-xl border border-red-200 p-3 text-sm text-red-700">{query.error.message}</p>}
    {query.isLoading&&<p className="text-sm text-muted-foreground">Đang tải lịch chăm sóc…</p>}
    {query.data&&!rows.length&&<p className="rounded-xl border p-5 text-sm text-muted-foreground">Chưa có lịch chăm sóc đang mở.</p>}
    <div className="space-y-3">{rows.map(x=><article key={x.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="space-y-1"><h3 className="font-semibold">{x.school}</h3><p className="text-sm">{x.subject} · {x.note}</p>
        <p className="text-xs text-muted-foreground">{channelDate(x.date)}</p></div>
      <div className="flex items-center gap-2">
        <span className={'rounded-full px-2 py-1 text-xs '+(Date.parse(x.date)<=Date.now()?'bg-amber-100 text-amber-900':'bg-emerald-100 text-emerald-900')}>
          {Date.parse(x.date)<=Date.now()?'Đến hạn / Quá hạn':'Sắp tới'}</span>
        <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>onSalesNavigate?.('role-customer-care-cases')}>Mở ticket</button>
      </div>
    </article>)}</div>
    {query.data&&<p className="text-xs text-muted-foreground">Danh sách dựa trên trang dữ liệu hiện tại của API; không phải tổng lịch công việc toàn hệ thống.</p>}
  </div>;
}
