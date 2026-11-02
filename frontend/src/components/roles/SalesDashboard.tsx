'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarClock, FileCheck2, Handshake, SquarePen, UsersRound } from 'lucide-react';
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
    <section aria-labelledby="sales-upcoming-heading" className="overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex items-center gap-2 border-b border-border/80 px-5 py-4">
        <CalendarClock aria-hidden="true" className="size-5 text-primary"/>
        <h2 id="sales-upcoming-heading" className="font-semibold">Lịch tư vấn sắp tới</h2>
      </div>
      {nextFollowups.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-sm">
            <thead className="bg-[#1b5e20] text-xs font-bold uppercase tracking-wide text-white">
              <tr><th scope="col" className="px-5 py-3">Trường học</th><th scope="col" className="px-5 py-3">Lịch hẹn</th><th scope="col" className="px-5 py-3 text-right">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {nextFollowups.map(customer => <tr key={customer.id} className="hover:bg-muted/30">
                <td className="px-5 py-4 font-medium">{customer.display_name}</td>
                <td className="px-5 py-4 text-muted-foreground">{formatDate(customer.next_follow_up_at!)}</td>
                <td className="px-5 py-4 text-right">
                  <button type="button" onClick={()=>go('role-sales-staff-activities')}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-[#1b5e20] hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    title={`Xem hoạt động tư vấn ${customer.display_name}`} aria-label={`Xem hoạt động tư vấn ${customer.display_name}`}>
                    <SquarePen className="size-4" aria-hidden="true"/>
                  </button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      ) : <p className="px-5 py-6 text-sm text-muted-foreground">Chưa có lịch tư vấn trong danh sách trường đang phụ trách.</p>}
    </section>
    <p className="text-xs text-muted-foreground">Hạn mức tiếp cận do Admin cấu hình và được kiểm tra bởi hệ thống khi đăng ký hoặc nhận phân bổ.</p>
  </div>;
}
