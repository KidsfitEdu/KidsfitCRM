'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Banknote, CheckCircle2, HandCoins, RefreshCw, Wallet, FileCheck2 } from 'lucide-react';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { AppButton } from '@/components/common/buttons/app-button';
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

export function DashboardPage({apiBase, token, abilities, onSalesNavigate}: RolePageProps) {
  const canView = abilities.includes('*') || abilities.includes('channel_sales.commission.view');
  const period = currentBusinessPeriod();
  const displayPeriod = `${period.slice(5, 7)}/${period.slice(0, 4)}`;
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
  const openContracts = () => onSalesNavigate?.('role-accounting-revenue');
  const tiles = [
    {label: 'Nhà trường thực thu ròng', amount: summary?.net_collected_revenue, icon: Banknote, detail: 'Các khoản thu thực tế sau hoàn tiền'},
    {label: 'Hoa hồng phát sinh', amount: summary?.accrued, icon: HandCoins, detail: 'Hoa hồng đã ghi nhận trong kỳ'},
    {label: 'Hoa hồng đã chuyển', amount: summary?.take_home, icon: CheckCircle2, detail: 'Hoa hồng đã thanh toán'},
    {label: 'Hoa hồng chờ đối soát / chi', amount: summary?.eligible, icon: Wallet, detail: 'Khoản còn cần theo dõi xử lý'},
  ];
  return <div className="min-w-0 space-y-5">
    <AppPageHeader eyebrow="KẾ TOÁN / KIDSFIT CRM" title="Tổng quan tài chính"
      description={`Theo dõi thực thu và hoa hồng trong tháng ${displayPeriod} theo phạm vi tài khoản.`}
      actions={connected ? <AdminIconAction icon={RefreshCw} label="Làm mới tổng quan tài chính"
        onClick={()=>{void finance.refetch();}} disabled={finance.isFetching}/> : undefined}/>
    {!connected && <p role="alert" className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      Vui lòng đăng nhập với tài khoản Kế toán có quyền xem hoa hồng.
    </p>}
    {connected && finance.isFetching && <output className="block text-xs text-muted-foreground">Đang cập nhật dữ liệu tài chính…</output>}
    {connected && finance.isError && <p role="alert" className="text-sm text-destructive">
      Không tải được số liệu. Vui lòng chọn làm mới để thử lại.
    </p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map(tile => <AppStatCard key={tile.label} label={tile.label}
        value={connected && !finance.isPending && tile.amount !== undefined ? channelMoney(tile.amount) : '—'}
        icon={tile.icon} description={tile.detail}/>)}
    </div>
    <section aria-labelledby="accounting-work-heading"
      className="crm-brand-surface overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="border-b border-border/70 px-5 py-4 sm:px-6">
        <h3 id="accounting-work-heading" className="flex items-center gap-2 text-base font-bold text-foreground">
          <FileCheck2 className="size-5 text-primary" aria-hidden="true"/>Nghiệp vụ tài chính
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Xử lý hồ sơ và kiểm tra chứng từ trong danh sách hợp đồng được phân quyền.
        </p>
      </div>
      <div className="grid gap-0 divide-y divide-border/70 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Hợp đồng & khoản thu</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Xem kỳ dịch vụ, xác nhận tái ký và chứng từ khoản thu.</p>
          </div>
          {onSalesNavigate && <AppButton type="button" tone="outline" size="sm"
            aria-label="Mở danh sách hợp đồng và khoản thu" onClick={openContracts}>
            Mở <ArrowUpRight className="size-4" aria-hidden="true"/>
          </AppButton>}
        </div>
        <div className="flex min-w-0 items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Phiếu chi hoa hồng</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Theo dõi nháp, phê duyệt và chứng từ đã thanh toán.</p>
          </div>
          {onSalesNavigate && <AppButton type="button" tone="outline" size="sm"
            aria-label="Mở màn hình hợp đồng và phiếu chi hoa hồng" onClick={openContracts}>
            Mở <ArrowUpRight className="size-4" aria-hidden="true"/>
          </AppButton>}
        </div>
      </div>
    </section>
  </div>;
}
