'use client';

import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Clock3, MessageSquareWarning, FileCheck2 } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelRequest } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';
import type { VerificationResponse } from '../Verification/VerificationPage';

/** CHECKEE metrics are calculated on the server over the complete scoped dataset. */
export function DashboardPage({apiBase, token, abilities, onSalesNavigate}: RolePageProps) {
  const authorized = !apiBase || abilities.includes('*') || abilities.includes('channel_sales.reconcile');
  const connected = !!apiBase && !!token && authorized;
  const summary = useQuery({
    queryKey: ['checkee-dashboard',token],
    queryFn: () => channelRequest<VerificationResponse>(
      apiBase,token,'/checkee/verifications?page=1&page_size=1'),
    enabled: connected,
  });
  if(!authorized) return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">
    Không có quyền xem tổng quan xác minh CHECKEE.
  </p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CHECKEE / KIDSFIT CRM" title="Tổng quan"
      description="Theo dõi hợp đồng cần xác minh, hồ sơ đã phản hồi và kết quả xác minh."
      actions={<AppButton disabled={!onSalesNavigate} onClick={()=>onSalesNavigate?.('role-checkee-verification')}
        leadingIcon={<FileCheck2 className="size-4" aria-hidden="true"/>}>
        Mở xác minh hợp đồng
      </AppButton>}/>
    {!connected && <p className="rounded-xl border p-4 text-sm text-muted-foreground">
      Chế độ xem thử chỉ đọc. Kết nối Backend để xem số liệu thật theo phạm vi CHECKEE.
    </p>}
    {summary.error && <p role="alert" className="rounded-xl border border-red-200 p-4 text-sm text-red-700">
      {summary.error instanceof Error ? summary.error.message : 'Không thể tải số liệu.'}
    </p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <AppStatCard icon={Clock3} label="Chờ xác minh"
        value={summary.data?.summary.pending ?? '—'}/>
      <AppStatCard icon={MessageSquareWarning} label="Đã phản hồi / Cần bổ sung"
        value={summary.data?.summary.feedback ?? '—'}/>
      <AppStatCard icon={BadgeCheck} label="Đã xác minh"
        value={summary.data?.summary.confirmed ?? '—'}/>
    </div>
    <section className="space-y-2 border-t border-border/80 pt-5">
      <h3 className="font-semibold">Công việc CHECKEE</h3>
      <p className="text-sm text-muted-foreground">
        Mở Xác minh hợp đồng để xem file đã ký, ghi nhận kết quả hoặc tra cứu lịch sử từng hồ sơ.
        Các số liệu được tổng hợp tại Backend, không dựa trên trang dữ liệu đang hiển thị.
      </p>
    </section>
  </div>;
}
