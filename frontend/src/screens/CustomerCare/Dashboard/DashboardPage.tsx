'use client';

import {useQuery} from '@tanstack/react-query';
import {Building2,Clock3,ClipboardList,CheckCircle2,ShieldAlert} from 'lucide-react';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AppStatCard} from '@/components/common/app-stat-card';
import {AppButton} from '@/components/common/buttons/app-button';
import {channelRequest} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';

type Summary={data:{schools:number;open_tickets:number;waiting_checkee:number;resolved_tickets:number;due_calls:number}};
export function DashboardPage({apiBase,token,abilities,onSalesNavigate}:RolePageProps){
  const allowed=!apiBase||abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const query=useQuery({queryKey:['care-summary',token],
    queryFn:()=>channelRequest<Summary>(apiBase,token,'/care/summary'),
    enabled:!!apiBase&&!!token&&allowed});
  if(!allowed)return <p role="alert">Không có quyền CSKH.</p>;
  const d=query.data?.data;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Tổng quan chăm sóc"
      description="Tiếp nhận cuộc gọi hỗ trợ trường, hướng dẫn sử dụng và theo dõi lỗi phần mềm chuyển CHECKEE."
      actions={<AppButton onClick={()=>onSalesNavigate?.('role-customer-care-customers')}>Trường phụ trách</AppButton>}/>
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc; kết nối Backend để xem dữ liệu thực tế.</p>}
    {query.error&&<p role="alert" className="rounded-xl border p-4 text-sm text-destructive">{query.error.message}</p>}
    {query.isLoading&&<p className="text-sm text-muted-foreground">Đang tải số liệu…</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AppStatCard icon={Building2} label="Trường phụ trách" value={d?.schools??'—'}/>
      <AppStatCard icon={ClipboardList} label="Ticket đang mở" value={d?.open_tickets??'—'}/>
      <AppStatCard icon={ShieldAlert} label="Lỗi chờ CHECKEE" value={d?.waiting_checkee??'—'}/>
      <AppStatCard icon={Clock3} label="Lịch hẹn đến hạn" value={d?.due_calls??'—'}/>
      <AppStatCard icon={CheckCircle2} label="Ticket hoàn tất" value={d?.resolved_tickets??'—'}/>
    </div>
    <div className="flex flex-wrap gap-3">
      <AppButton tone="outline" onClick={()=>onSalesNavigate?.('role-customer-care-customers')}>Ghi nhật ký cuộc gọi</AppButton>
      <AppButton tone="outline" onClick={()=>onSalesNavigate?.('role-customer-care-cases')}>Theo dõi ticket lỗi hệ thống</AppButton>
    </div>
    <p className="text-xs text-muted-foreground">Số trường và ticket là tổng dữ liệu theo quyền truy cập; lịch hẹn đến hạn dựa trên các hoạt động hỗ trợ đã ghi.</p>
  </div>;
}
