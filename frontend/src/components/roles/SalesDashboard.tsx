'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarClock, ClipboardList, FileCheck2, Handshake, School, SquarePen, UsersRound } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

export function SalesDashboard({apiBase, token, abilities, workspace, onSalesNavigate}:RolePageProps) {
  const preview = !apiBase;
  const permitted = abilities.includes('*') || abilities.includes('channel_sales.customer.view');
  const operations = useQuery({
    queryKey:['sales-brief', token],
    enabled:!!apiBase && !!token && permitted,
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1'),
  });
  const owned = workspace.data.filter(c => c.can_manage_approach ||
    (c.visible_status === 'CONTRACTED' && c.contract_id !== null));
  const activeCount = owned.filter(c => c.visible_status === 'APPROACHING').length;
  const pendingInvitations = operations.data?.invitations.filter(x => x.status === 'PENDING' && x.can_respond).length;
  const pendingProposals = operations.data?.proposals.filter(x => x.status.startsWith('PENDING_')).length;
  const nextFollowups = owned.filter(c => c.can_manage_approach && c.next_follow_up_at)
    .sort((a,b)=>new Date(a.next_follow_up_at!).getTime()-new Date(b.next_follow_up_at!).getTime()).slice(0,4);
  const formatDate = (date:string) => new Intl.DateTimeFormat('vi-VN',{
    dateStyle:'short', timeStyle:'short', timeZone:'Asia/Ho_Chi_Minh',
  }).format(new Date(date));
  const go = (view:'role-sales-staff-schools'|'role-sales-staff-customers'|'role-sales-staff-activities'|'role-sales-staff-proposals') => onSalesNavigate?.(view);
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BÁN HÀNG / TỔNG QUAN" title="Công việc của tôi"
      description="Theo dõi trường đang tiếp cận, việc sắp đến hạn và các hồ sơ cần phản hồi."/>
    {preview && <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      Dữ liệu xem trước chỉ để minh họa, không thể thay đổi hồ sơ thực tế.
    </p>}
    {operations.error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="size-4"/>{operations.error.message}
    </p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AppStatCard icon={Handshake} label="Trường đang tiếp cận" value={activeCount} description="Đang có quyền tiếp cận hợp lệ"/>
      <AppStatCard icon={CalendarClock} label="Sắp hết hạn" value={workspace.metrics.expiring_soon} description="Cần cập nhật tiến độ hoặc xin gia hạn"/>
      <AppStatCard icon={UsersRound} label="Lời mời chờ phản hồi" value={preview ? '—' : pendingInvitations} description="Nhận hoặc từ chối phân bổ"/>
      <AppStatCard icon={FileCheck2} label="Đề xuất đang xử lý" value={preview ? '—' : pendingProposals} description="Chờ Quản lý hoặc Admin phản hồi"/>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="size-5 text-primary" aria-hidden="true"/>
          <h3 className="font-semibold">Lịch tư vấn sắp tới</h3>
        </div>
        {nextFollowups.length ? <ul className="divide-y divide-border">
          {nextFollowups.map(customer => <li key={customer.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">{customer.display_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">Hẹn: {formatDate(customer.next_follow_up_at!)}</p>
            </div>
            <button type="button" onClick={()=>go('role-sales-staff-activities')}
              className="grid size-10 place-items-center rounded-lg border border-border text-[#1b5e20] hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              title={`Cập nhật tư vấn ${customer.display_name}`} aria-label={`Cập nhật tư vấn ${customer.display_name}`}>
              <SquarePen className="size-4" aria-hidden="true"/>
            </button>
          </li>)}
        </ul> : <p className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">
          Chưa có lịch tư vấn được ghi nhận trong danh sách trường đang phụ trách.
        </p>}
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="size-5 text-primary" aria-hidden="true"/>
          <h3 className="font-semibold">Lối tắt công việc</h3>
        </div>
        <div className="grid gap-2">
          {[
            {label:'Tìm và đăng ký trường',view:'role-sales-staff-schools' as const,icon:School},
            {label:'Trường của tôi / nhận phân bổ',view:'role-sales-staff-customers' as const,icon:UsersRound},
            {label:'Tiếp cận / yêu cầu gia hạn',view:'role-sales-staff-activities' as const,icon:Handshake},
            {label:'Theo dõi đề xuất trường',view:'role-sales-staff-proposals' as const,icon:ClipboardList},
          ].map(link=><button key={link.view} type="button" onClick={()=>go(link.view)}
            className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-4 text-left text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary">
            <link.icon className="size-4 shrink-0 text-primary" aria-hidden="true"/>{link.label}
          </button>)}
        </div>
      </section>
    </div>
    <p className="text-xs text-muted-foreground">Hạn mức tiếp cận do Admin cấu hình và được kiểm tra bởi hệ thống khi đăng ký hoặc nhận phân bổ.</p>
  </div>;
}
