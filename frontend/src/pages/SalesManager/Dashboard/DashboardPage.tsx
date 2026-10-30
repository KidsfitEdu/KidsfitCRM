'use client';
import { useQuery } from '@tanstack/react-query';
import { AppStatCard } from '@/components/common/app-stat-card';
import { Building2, ClipboardList, CalendarClock, Handshake, TrendingUp } from 'lucide-react';
import { channelRequest, currentBusinessPeriod } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace,SchoolOperationsReport } from '@/lib/school-operations';
import type { ManagerPageProps } from '@/types/manager-pages';
export function DashboardPage({apiBase,token,abilities}:ManagerPageProps){
 const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.allocation.manage');
 const overview=useQuery({queryKey:['sales-manager-overview',token],enabled:!!apiBase&&!!token&&allowed,queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1')});
 const period=currentBusinessPeriod();
 const report=useQuery({queryKey:['sales-manager-report',token,period],enabled:!!apiBase&&!!token&&allowed,queryFn:()=>channelRequest<SchoolOperationsReport>(apiBase,token,'/school-operations/report?period='+period)});
 if(!allowed)return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">Tài khoản không có quyền Quản lý bán hàng.</p>;
 const data=overview.data;const metrics:[string,number|undefined][]=[
 ['Đề xuất chờ Quản lý',data?.proposals.filter(x=>x.can_manager_review&&x.status==='PENDING_MANAGER').length],
 ['Lời mời chờ phản hồi',data?.invitations.filter(x=>x.status==='PENDING').length],
 ['Gia hạn chờ duyệt',data?.extensions.filter(x=>x.can_review&&x.status==='PENDING').length],
 ['Đề xuất quá hạn',report.data?.overdue_proposals],
 ['Gia hạn quá hạn',report.data?.overdue_extensions],
 ['Trường chưa đăng ký',report.data?.available_schools]];
 return <div className="space-y-5">
 {(overview.error||report.error)&&<p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">Không tải được dữ liệu giám sát. Vui lòng kiểm tra kết nối và quyền truy cập.</p>}
 <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label,value],index)=><AppStatCard key={label} label={label} value={value??'—'} icon={[ClipboardList,Building2,CalendarClock,Handshake,TrendingUp][index%5]}/>)}</div>
 <div className="rounded-2xl border bg-card p-5"><h3 className="font-semibold">Công việc cần xử lý</h3><p className="mt-2 text-sm text-muted-foreground">Tiếp nhận đề xuất CTV, theo dõi lời mời phân bổ và duyệt gia hạn trước khi quyền tiếp cận hết hiệu lực. Hồ sơ đang chờ không tự giữ quyền.</p></div>
 </div>;
}
