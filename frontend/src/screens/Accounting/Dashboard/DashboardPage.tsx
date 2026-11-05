'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote, CheckCircle2, HandCoins, Wallet } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppStatCard } from '@/components/common/app-stat-card';
import { channelMoney, channelRequest, currentBusinessPeriod } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

type FinanceSummary = {
  period: string;
  summary: {
    net_collected_revenue: number;
    accrued: number;
    paid: number;
    eligible: number;
    take_home: number;
  };
};

export function DashboardPage({apiBase, token, abilities}: RolePageProps) {
  const canView = abilities.includes('*') || abilities.includes('channel_sales.commission.view');
  const period = currentBusinessPeriod();
  const connected = Boolean(apiBase && token && canView);
  const finance = useQuery({
    queryKey: ['accounting-overview', apiBase, token, period],
    queryFn: () => channelRequest<FinanceSummary>(apiBase, token, `/finance?period=${period}`),
    enabled: connected,
  });
  // React Query can rerender and refetch; notify once per failed request, not per render.
  const lastNotifiedErrorAt = useRef(0);
  useEffect(() => {
    if (!connected || !finance.isError || !finance.errorUpdatedAt || finance.errorUpdatedAt === lastNotifiedErrorAt.current) return;
    lastNotifiedErrorAt.current = finance.errorUpdatedAt;
    appNotice.error('Không tải được tổng quan Kế toán.', finance.error instanceof Error ? finance.error.message : 'Vui lòng thử lại.');
  }, [connected, finance.isError, finance.errorUpdatedAt, finance.error]);
  const summary = finance.data?.summary;
  const tiles = [
    {label: 'Nhà trường thực thu ròng', amount: summary?.net_collected_revenue, icon: Banknote},
    {label: 'Hoa hồng phát sinh', amount: summary?.accrued, icon: HandCoins},
    {label: 'Hoa hồng đã chuyển', amount: summary?.take_home, icon: CheckCircle2},
    {label: 'Hoa hồng chờ đối soát / chi', amount: summary?.eligible, icon: Wallet},
  ];
  return <div className="space-y-5">
    <AppPageHeader eyebrow="KẾ TOÁN / KIDSFIT CRM" title="Tổng quan"
      description={`Doanh thu thực thu và hoa hồng theo tháng ${period}. Chỉ hiển thị dữ liệu trong phạm vi được cấp.`}/>
    {!connected && <p role="alert" className="rounded-xl border p-4 text-sm text-muted-foreground">
      Vui lòng đăng nhập với tài khoản Kế toán có quyền xem hoa hồng.
    </p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map(tile => <AppStatCard key={tile.label} label={tile.label}
        value={connected && !finance.isPending && tile.amount !== undefined ? channelMoney(tile.amount) : '—'}
        icon={tile.icon}/>)}
    </div>
    <p className="text-sm text-muted-foreground">Mở <strong>Hợp đồng & hoa hồng</strong> để xem từng trường chính, các đợt thanh toán, số tiền nhận và chứng từ chuyển khoản.</p>
  </div>;
}
