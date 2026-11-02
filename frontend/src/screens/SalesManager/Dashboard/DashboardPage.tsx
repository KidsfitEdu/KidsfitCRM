'use client';

import { useQuery } from '@tanstack/react-query';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AppPageHeader } from '@/components/common/app-page-header';
import { Building2, ClipboardList, CalendarClock, Handshake, TrendingUp, FileCheck2, Send, Undo2 } from 'lucide-react';
import { channelRequest, currentBusinessPeriod } from '@/lib/channel-operations';
import type { SchoolOperationsReport } from '@/lib/school-operations';
import type { ManagerPageProps } from '@/types/manager-pages';

type ManagerOverview = {
  pending_proposals:number; pending_invitations:number; pending_extensions:number;
  pending_contracts:number;awaiting_checkee:number;needs_revision:number;verified_contracts:number;
};

/** Live counts are aggregated by the backend over the manager's authorized scope, never from the first 100 rows. */
export function DashboardPage({apiBase,token,abilities}:ManagerPageProps){
 const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.allocation.manage');
 const overview=useQuery({
   queryKey:['sales-manager-overview-aggregated',token],
   enabled:!!apiBase&&!!token&&allowed,
   queryFn:()=>channelRequest<ManagerOverview>(apiBase,token,'/manager/overview')
 });
 const period=currentBusinessPeriod();
 const report=useQuery({
   queryKey:['sales-manager-report',token,period],
   enabled:!!apiBase&&!!token&&allowed,
   queryFn:()=>channelRequest<SchoolOperationsReport>(apiBase,token,'/school-operations/report?period='+period)
 });
 if(!allowed)return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">Tài khoản không có quyền Quản lý bán hàng.</p>;
 const data=overview.data;
 const tiles:[string,number|undefined,typeof Building2][]=[
   ['Đề xuất chờ Quản lý',data?.pending_proposals,ClipboardList],
   ['Lời mời chờ phản hồi',data?.pending_invitations,Building2],
   ['Gia hạn chờ duyệt',data?.pending_extensions,CalendarClock],
   ['Hợp đồng chờ rà soát',data?.pending_contracts,FileCheck2],
   ['Đang chờ CHECKEE',data?.awaiting_checkee,Send],
   ['Hợp đồng cần bổ sung',data?.needs_revision,Undo2],
   ['Đã xác minh',data?.verified_contracts,Handshake],
   ['Đề xuất quá hạn',report.data?.overdue_proposals,TrendingUp],
   ['Gia hạn quá hạn',report.data?.overdue_extensions,CalendarClock]
 ];
 return <div className="space-y-5">
  <AppPageHeader eyebrow="QUẢN LÝ BÁN HÀNG / KIDSFIT CRM"
   title="Tổng quan đội ngũ" description="Theo dõi đề xuất, phân bổ, gia hạn và luồng hợp đồng gửi CHECKEE."/>
  {(overview.error||report.error)&&<p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">
    Không tải được một phần dữ liệu giám sát. Kiểm tra kết nối và phân quyền.</p>}
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{tiles.map(([label,value,icon])=>
    <AppStatCard key={label} label={label} value={apiBase&&typeof value==='number'?value:'—'} icon={icon}/>)}
  </div>
  <section className="border-t border-border/80 pt-5">
    <h3 className="font-semibold">Công việc cần xử lý</h3>
    <p className="mt-2 text-sm text-muted-foreground">Ưu tiên hợp đồng chờ kiểm tra trước khi chuyển CHECKEE, đề xuất trường, phân bổ và gia hạn. Các số liệu được tính từ database trong phạm vi được cấp quyền.</p>
  </section>
 </div>;
}
