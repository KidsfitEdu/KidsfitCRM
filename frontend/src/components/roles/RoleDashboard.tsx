'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, Activity, Building2, CalendarClock, ClipboardList, FileCheck2, Handshake } from 'lucide-react';
import { AppButton } from '@/components/common/app-button';
import { AppStatCard } from '@/components/common/app-stat-card';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/src/types/role-pages';
import type { RolePageGroup } from '@/src/config/role-pages';

/** Exact dashboard tiles and authorization behavior shared by six UI profiles. */
export function RoleDashboard({ role, ...props }: RolePageProps & { role: RolePageGroup }) {
  const { apiBase, token, abilities, workspace } = props;
  const preview = !apiBase;
  const canView = abilities.includes('channel_sales.customer.view') || abilities.includes('*');
  const operations = useQuery({
    queryKey: [role.toLowerCase().replace(/([a-z])([A-Z])/g, '$1-$2') + '-summary', token],
    queryFn: () => channelRequest<SchoolOperationsWorkspace>(apiBase, token, '/school-operations?page=1'),
    enabled: !preview && !!token && canView,
  });
  const metrics = workspace.metrics;
  const summary = operations.data;
  const format = (value: number | null | undefined) => typeof value === 'number' ? value.toLocaleString('vi-VN') : '—';
  const tiles: [string, number | undefined][] = [
    ['Chưa đăng ký', metrics.available],
    ['Đang tiếp cận', metrics.approaching],
    ['Đã ký hợp đồng', metrics.contracted],
    ['Sắp hết hạn tiếp cận', metrics.expiring_soon],
    ['Đề xuất chờ xử lý', summary?.proposals.filter(p => p.status.startsWith('PENDING_')).length],
    ['Gia hạn chờ xử lý', summary?.extensions.filter(e => e.status === 'PENDING').length],
  ];
  return <div className="space-y-5">
    {preview && <p className="rounded-xl border bg-muted/50 p-3 text-sm text-muted-foreground">Dữ liệu xem thử, không có quyền ghi vào hệ thống thật.</p>}
    {operations.error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="size-4"/>{operations.error.message}</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{tiles.map(([label, value], index) =>
      <AppStatCard key={label} label={label} value={preview ? '—' : format(value)}
        icon={[Building2, Handshake, FileCheck2, CalendarClock, ClipboardList, Activity][index % 6]} />
    )}</div>
    <div className="crm-dashboard-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Công việc cần xử lý</h3><AppButton tone="outline" disabled={preview || operations.isFetching} onClick={() => void operations.refetch()}><RefreshCw className="mr-2 size-4"/>Làm mới</AppButton></div>
      <p className="mt-2 text-sm text-muted-foreground">Các số liệu phản ánh dữ liệu tài khoản được API cho phép truy cập. Mở menu bên trái để xem hồ sơ và thực hiện thao tác đúng thẩm quyền.</p>
    </div>
  </div>;
}
