'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, CalendarClock, FileCheck2, Handshake, RefreshCw,
  UsersRound, ArrowUpRight, ClipboardList, ShieldAlert,
} from 'lucide-react';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

/** Sales-facing dashboard: only known, scoped metrics and actionable tasks.
 * A historical performance chart must not be fabricated from current list totals.
 */
export function SalesDashboard({apiBase, token, abilities, workspace, onSalesNavigate, onChanged}:RolePageProps) {
  const preview = !apiBase;
  const permitted = abilities.includes('*') || abilities.includes('channel_sales.customer.view');
  const operations = useQuery({
    queryKey:['sales-brief', apiBase, token],
    enabled:!!apiBase && !!token && permitted,
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1'),
  });
  const owned = workspace.data.filter(c => c.can_manage_approach ||
    (c.visible_status === 'CONTRACTED' && c.contract_id !== null));
  // A visible page of workspace data is not an all-record count.
  const activeCount = owned.filter(c => c.visible_status === 'APPROACHING').length;
  const pendingInvitations = operations.data?.invitations.filter(x => x.status === 'PENDING' && x.can_respond).length;
  const pendingProposals = operations.data?.proposals.filter(x => x.status.startsWith('PENDING_')).length;
  const go = (view:'role-sales-staff-schools'|'role-sales-staff-customers'|'role-sales-staff-activities'|'role-sales-staff-proposals') => onSalesNavigate?.(view);
  const refresh = async () => {
    await Promise.allSettled([operations.refetch(), onChanged?.()]);
  };
  const actionable = [
    {
      label:'Lời mời phân bổ',
      detail:'Cần nhận hoặc từ chối trường được giao',
      value:preview || !permitted || !operations.data ? '—' : pendingInvitations ?? 0,
      icon:UsersRound,
      target:'role-sales-staff-customers' as const,
    },
    {
      label:'Đề xuất đang xử lý',
      detail:'Kiểm tra phản hồi của Quản lý hoặc Admin',
      value:preview || !permitted || !operations.data ? '—' : pendingProposals ?? 0,
      icon:ClipboardList,
      target:'role-sales-staff-proposals' as const,
    },
    {
      label:'Trường sắp hết hạn',
      detail:'Ghi nhận tiến độ và kiểm tra quyền tiếp cận',
      value:workspace.metrics.expiring_soon,
      icon:ShieldAlert,
      target:'role-sales-staff-customers' as const,
    },
  ];

  return <div className="space-y-5">
    <AppPageHeader eyebrow="BÁN HÀNG / KIDSFIT CRM" title="Tổng quan bán hàng"
      description="Theo dõi trường đang phụ trách, lời mời phân bổ và các công việc cần xử lý."
      actions={<AdminIconAction icon={RefreshCw} label="Làm mới tổng quan bán hàng"
        disabled={preview || !permitted || operations.isFetching}
        onClick={()=>{void refresh();}}/>}/>
    {preview && <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      Dữ liệu xem trước chỉ để minh họa, không thể thay đổi hồ sơ thực tế.
    </p>}
    {!preview && !permitted && <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
      Tài khoản chưa có quyền xem dữ liệu tổng quan bán hàng.
    </p>}
    {operations.error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="size-4" aria-hidden="true"/>
      Không tải được công việc chờ xử lý. Có thể thử làm mới.
    </p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={operations.isFetching}>
      <AppStatCard icon={Handshake} label="Trường đang tiếp cận"
        value={permitted ? activeCount : '—'}
        description="Trong danh sách trường hiện tải, có quyền tiếp cận"/>
      <AppStatCard icon={CalendarClock} label="Sắp hết hạn"
        value={permitted ? workspace.metrics.expiring_soon : '—'}
        description="Cần kiểm tra tiến độ hoặc xin gia hạn"/>
      <AppStatCard icon={UsersRound} label="Lời mời chờ phản hồi"
        value={preview || !permitted || !operations.data ? '—' : pendingInvitations}
        description="Nhận hoặc từ chối phân bổ"/>
      <AppStatCard icon={FileCheck2} label="Đề xuất đang xử lý"
        value={preview || !permitted || !operations.data ? '—' : pendingProposals}
        description="Chờ Quản lý hoặc Admin phản hồi"/>
    </div>
    <section aria-labelledby="sales-priority-heading"
      className="crm-brand-surface overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 px-5 py-4">
        <div>
          <h2 id="sales-priority-heading" className="flex items-center gap-2 font-semibold text-foreground">
            <ClipboardList className="size-5 text-primary" aria-hidden="true"/>Công việc cần theo dõi
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ưu tiên xử lý lời mời, đề xuất trường và quyền tiếp cận sắp hết hạn.
          </p>
        </div>
      </div>
      <div className="grid divide-y divide-border/70 md:grid-cols-3 md:divide-y-0 md:divide-x">
        {actionable.map(item=><div key={item.label} className="flex min-w-0 items-center gap-3 p-4 sm:p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <item.icon className="size-5" aria-hidden="true"/>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
          </div>
          <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-bold tabular-nums">
            {item.value}
          </span>
          {onSalesNavigate && <AdminIconAction icon={ArrowUpRight}
            label={`Mở ${item.label}`} onClick={()=>go(item.target)}/>}
        </div>)}
      </div>
    </section>
  </div>;
}
