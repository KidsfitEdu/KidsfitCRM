'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, ClipboardList, Clock3, CheckCircle2, ShieldCheck } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

export function DashboardPage({apiBase,token,abilities,onSalesNavigate}:RolePageProps) {
  const allowed=!apiBase||abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const query=useQuery({
    queryKey:['care-dashboard',token],
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1'),
    enabled:!!apiBase&&!!token&&allowed,
  });
  const cases=query.data?.support_cases??[];
  const contracts=query.data?.contracts??[];
  const due=cases.filter(x=>x.status!=='RESOLVED').flatMap(x=>x.activities)
    .filter(x=>x.next_follow_up_at&&Date.parse(x.next_follow_up_at)<=Date.now()).length;
  if(!allowed)return <p role="alert">Không có quyền xem tổng quan chăm sóc khách hàng.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Tổng quan chăm sóc"
      description="Theo dõi hồ sơ được bàn giao, ticket cần xử lý và kết quả hỗ trợ trường."
      actions={<AppButton disabled={!onSalesNavigate} onClick={()=>onSalesNavigate?.('role-customer-care-cases')}>
        Mở yêu cầu hỗ trợ
      </AppButton>}/>
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc; kết nối Backend để xem số liệu thực tế.</p>}
    {query.error&&<p role="alert" className="rounded-xl border border-red-200 p-3 text-sm text-red-700">{query.error.message}</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AppStatCard icon={Building2} label="Hợp đồng đang phụ trách" value={query.data?contracts.filter(c=>c.care_user_id===query.data.user_id).length:'—'}/>
      <AppStatCard icon={ClipboardList} label="Ticket chưa hoàn tất" value={query.data?cases.filter(x=>x.status!=='RESOLVED').length:'—'}/>
      <AppStatCard icon={ShieldCheck} label="Đang chờ CHECKEE" value={query.data?cases.filter(x=>x.ticket_type==='SYSTEM_ERROR'&&!x.checkee_responded_at&&x.status!=='RESOLVED').length:'—'}/>
      <AppStatCard icon={Clock3} label="Lịch chăm sóc đến hạn" value={query.data?due:'—'}/>
      <AppStatCard icon={CheckCircle2} label="Ticket đã hoàn tất" value={query.data?cases.filter(x=>x.status==='RESOLVED').length:'—'}/>
    </div>
    <p className="text-xs text-muted-foreground">Chỉ số được tính từ trang dữ liệu hiện tại của API (tối đa 100 mục), không phải báo cáo tổng hợp toàn bộ hồ sơ.</p>
  </div>;
}
