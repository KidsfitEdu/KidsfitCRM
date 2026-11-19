'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Banknote, CheckCircle2, HandCoins, RefreshCw, Wallet, FileCheck2, Clock3, AlertCircle } from 'lucide-react';
import { CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppMonthPicker } from '@/components/common/forms/app-month-picker';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppStatCard } from '@/components/common/app-stat-card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { channelMoney, channelRequest, currentBusinessPeriod } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

type FinanceTrend = { period: string; collected: number; refunded: number; net: number; accrued: number };
type StatusCount = { status: string; count: number };
type AttentionCount = { status: string; count: number; amount: number };
type FinanceSummary = {
  period: string;
  summary: {
    net_collected_revenue: number;
    accrued: number;
    paid: number;
    eligible: number;
    eligible_for_payout: number;
    take_home: number;
  };
  revenue_trend: FinanceTrend[];
  payout_statuses: StatusCount[];
  attention: AttentionCount[];
};

const trendConfig = {
  net: {label:'Thực thu ròng',color:'var(--chart-1)'},
  accrued: {label:'Hoa hồng phát sinh',color:'var(--chart-3)'},
};
const statusLabels: Record<string,string> = {
  DRAFT:'Nháp',PENDING_APPROVAL:'Chờ BGĐ duyệt',
  CHANGES_REQUESTED:'Cần bổ sung',APPROVED:'Đã duyệt',
  PAID:'Đã chi',CANCELLED:'Đã hủy',REJECTED:'Đã từ chối',
};
const statusColors: Record<string,string> = {
  DRAFT:'var(--chart-4)',PENDING_APPROVAL:'var(--chart-3)',
  CHANGES_REQUESTED:'var(--destructive)',APPROVED:'var(--chart-2)',
  PAID:'var(--chart-1)',CANCELLED:'var(--muted-foreground)',REJECTED:'var(--chart-5)',
};
const statusConfig = Object.fromEntries(Object.entries(statusLabels).map(([key,label])=>[
  key,{label,color:statusColors[key]},
]));
const monthLabel=(month:string)=>{const [year,m]=month.split('-');return 'T'+Number(m)+'/'+year.slice(-2);};
const attentionTypes=[
  {key:'PENDING_APPROVAL',label:'Chờ BGĐ duyệt',icon:Clock3},
  {key:'APPROVED',label:'Đã duyệt, chờ chuyển tiền',icon:Wallet},
  {key:'CHANGES_REQUESTED',label:'Cần bổ sung hồ sơ',icon:AlertCircle},
];

export function DashboardPage({apiBase, token, abilities, onSalesNavigate}: RolePageProps) {
  const canView = abilities.includes('*') || abilities.includes('channel_sales.commission.view');
  const [period,setPeriod] = useState(currentBusinessPeriod);
  const connected = Boolean(apiBase && token && canView);
  const finance = useQuery({
    queryKey: ['accounting-overview', apiBase, token, period],
    queryFn: () => channelRequest<FinanceSummary>(apiBase, token, `/finance?period=${period}`),
    enabled: connected,
  });
  const lastNotifiedErrorAt = useRef(0);
  useEffect(() => {
    if (!connected || !finance.isError || !finance.errorUpdatedAt || finance.errorUpdatedAt === lastNotifiedErrorAt.current) return;
    lastNotifiedErrorAt.current = finance.errorUpdatedAt;
    appNotice.error('Không tải được tổng quan Kế toán.', finance.error instanceof Error ? finance.error.message : 'Vui lòng thử lại.');
  }, [connected, finance.isError, finance.errorUpdatedAt, finance.error]);
  const summary = finance.data?.summary;
  const trend = finance.data?.revenue_trend ?? [];
  const trendHasData = trend.some(x=>x.collected!==0||x.refunded!==0||x.accrued!==0);
  const status = (finance.data?.payout_statuses??[]).filter(x=>x.count>0).map(x=>({
    ...x,label:statusLabels[x.status]??x.status,fill:statusColors[x.status]??'var(--muted-foreground)',
  }));
  const statusTotal=status.reduce((sum,x)=>sum+x.count,0);
  const attention=finance.data?.attention??[];
  const displayPeriod = period.slice(5,7)+'/'+period.slice(0,4);
  const previous = trend.length>=2?trend[trend.length-2]:null;
  const priorComparison = previous && summary && previous.net!==0
    ? ((summary.net_collected_revenue-previous.net)/Math.abs(previous.net)*100).toLocaleString('vi-VN',{maximumFractionDigits:1})+'% so với tháng trước'
    : 'Chưa đủ cơ sở so sánh với tháng trước';
  const tiles = [
    {label:'Nhà trường thực thu ròng',amount:summary?.net_collected_revenue,icon:Banknote,detail:priorComparison},
    {label:'Hoa hồng phát sinh',amount:summary?.accrued,icon:HandCoins,detail:'Hoa hồng ghi nhận trong kỳ phát sinh'},
    {label:'Hoa hồng đã chuyển',amount:summary?.take_home,icon:CheckCircle2,detail:'Theo ngày chi thực tế trong tháng'},
    {label:'Đủ điều kiện lập phiếu',amount:summary?.eligible_for_payout,icon:Wallet,detail:'Bút toán còn khả dụng để lập phiếu'},
  ];
  const openWorkspace=(tab:'CONTRACTS'|'RECEIPTS'|'PAYOUTS'='CONTRACTS',status?:string)=>{
    if(!onSalesNavigate)return;
    onSalesNavigate('role-accounting-revenue');
    const params=new URLSearchParams();
    params.set('tab',tab);
    if(status)params.set('status',status);
    window.history.replaceState(null,'',window.location.pathname+'?'+params.toString());
  };
  return <div className="min-w-0 space-y-5">
    <AppPageHeader eyebrow="KẾ TOÁN / KIDSFIT CRM" title="Tổng quan tài chính"
      description={`Theo dõi thực thu, hoa hồng phát sinh và thực chi tháng ${displayPeriod} theo phạm vi tài khoản.`}
      actions={<div className="flex flex-wrap items-center gap-2">
        <AppMonthPicker label="Kỳ báo cáo" allowAll={false} value={period} onChange={setPeriod}
          className="w-[170px]"/>
        <AdminIconAction icon={RefreshCw} label="Làm mới tổng quan tài chính"
          onClick={()=>{void finance.refetch();}} disabled={!connected||finance.isFetching}/>
      </div>}/>
    {!connected && <p role="alert" className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      Vui lòng đăng nhập với tài khoản Kế toán có quyền xem hoa hồng.
    </p>}
    {connected && finance.isFetching && <output className="block text-xs text-muted-foreground">Đang cập nhật dữ liệu tài chính…</output>}
    {connected && finance.isError && <p role="alert" className="text-sm text-destructive">
      Không tải được số liệu. Vui lòng chọn làm mới để thử lại.
    </p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={finance.isFetching}>
      {tiles.map(tile => <AppStatCard key={tile.label} label={tile.label}
        value={connected && !finance.isPending && tile.amount !== undefined ? channelMoney(tile.amount) : '—'}
        icon={tile.icon} description={tile.detail}/>)}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <section aria-labelledby="accounting-revenue-trend" className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 xl:col-span-2">
        <h2 id="accounting-revenue-trend" className="text-base font-semibold">Xu hướng tài chính theo tháng</h2>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">Thực thu ròng và hoa hồng phát sinh · 6 tháng đến kỳ đã chọn · VNĐ</p>
        {connected && finance.data && trendHasData
          ? <ChartContainer config={trendConfig} className="h-[285px] w-full">
              <LineChart accessibilityLayer data={trend} margin={{top:12,right:12,bottom:8,left:0}}>
                <CartesianGrid vertical={false} strokeDasharray="4 4"/>
                <XAxis dataKey="period" tickFormatter={monthLabel} tickLine={false} axisLine={false}/>
                <YAxis width={72} tickLine={false} axisLine={false}
                  tickFormatter={value=>Number(value).toLocaleString('vi-VN',{notation:'compact',maximumFractionDigits:1})}/>
                <ChartTooltip content={<ChartTooltipContent labelFormatter={v=>monthLabel(String(v))}
                  formatter={(value,name)=><span className="text-xs tabular-nums">
                    {trendConfig[name as keyof typeof trendConfig]?.label??name}: {channelMoney(Number(value))}
                  </span>}/>}/>
                <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2.5}
                  dot={{r:3}} activeDot={{r:5}}/>
                <Line type="monotone" dataKey="accrued" stroke="var(--color-accrued)" strokeWidth={2}
                  dot={{r:3}} activeDot={{r:5}}/>
              </LineChart>
            </ChartContainer>
          : <div className="flex h-[285px] items-center justify-center rounded-xl border border-dashed border-border px-5 text-center text-sm text-muted-foreground">
              {finance.isFetching?'Đang tải số liệu xu hướng…':'Chưa có dữ liệu tài chính để hiển thị xu hướng.'}
            </div>}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[var(--chart-1)]"/>Thực thu ròng</span>
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[var(--chart-3)]"/>Hoa hồng phát sinh</span>
        </div>
      </section>
      <section aria-labelledby="accounting-payout-status" className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 id="accounting-payout-status" className="text-base font-semibold">Trạng thái phiếu chi</h2>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">Theo ngày lập phiếu trong tháng {displayPeriod}</p>
        {connected && finance.data && statusTotal>0
          ? <ChartContainer config={statusConfig} className="mx-auto h-[230px] w-full max-w-[330px]">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent formatter={(value,name)=>
                  <span className="text-xs">{name}: {Number(value).toLocaleString('vi-VN')} phiếu</span>}/>}/>
                <Pie data={status} dataKey="count" nameKey="label" innerRadius={65} outerRadius={92} paddingAngle={2}/>
              </PieChart>
            </ChartContainer>
          : <div className="flex h-[230px] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              {finance.isFetching?'Đang tải cơ cấu phiếu chi…':'Chưa có phiếu chi trong kỳ báo cáo.'}
            </div>}
        {statusTotal>0&&<div className="mt-3 space-y-2" aria-label="Chi tiết trạng thái phiếu chi">
          {status.map(x=><div key={x.status} className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{backgroundColor:x.fill}}/>{x.label}
            </span>
            <span className="font-semibold tabular-nums">{x.count} phiếu</span>
          </div>)}
        </div>}
      </section>
    </div>
    <section aria-labelledby="accounting-attention" className="crm-brand-surface rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="accounting-attention" className="text-base font-semibold">Công việc cần xử lý</h2>
          <p className="mt-1 text-xs text-muted-foreground">Các phiếu chưa hoàn tất, bao gồm tồn đọng từ kỳ trước</p>
        </div>
        {connected&&onSalesNavigate&&<AppButton type="button" tone="outline" size="sm" onClick={()=>openWorkspace('PAYOUTS')}>
          Xem danh sách <ArrowUpRight className="size-4" aria-hidden="true"/>
        </AppButton>}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {attentionTypes.map(item=>{
          const found=attention.find(x=>x.status===item.key);
          return <button type="button" key={item.key}
            disabled={!connected||!finance.data||!onSalesNavigate}
            onClick={()=>openWorkspace('PAYOUTS',item.key)}
            className="flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors enabled:hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default">
            <item.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true"/>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{connected&&finance.data?found?.count??0:'—'} <span className="text-xs font-normal text-muted-foreground">phiếu</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{connected&&finance.data?channelMoney(found?.amount??0):'Chưa có dữ liệu'}</p>
            </div>
          </button>;
        })}
      </div>
    </section>
    <section aria-labelledby="accounting-work-heading" className="crm-brand-surface overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div>
          <h2 id="accounting-work-heading" className="flex items-center gap-2 text-base font-bold text-foreground">
            <FileCheck2 className="size-5 text-primary" aria-hidden="true"/> Nghiệp vụ tài chính
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Kiểm tra hồ sơ hợp đồng, khoản thu và chứng từ chi theo quyền.</p>
        </div>
        {connected&&onSalesNavigate&&<AppButton type="button" tone="outline" size="sm"
          aria-label="Mở Hợp đồng và hoa hồng" onClick={()=>openWorkspace('CONTRACTS')}>
          Xem danh sách <ArrowUpRight className="size-4" aria-hidden="true"/>
        </AppButton>}
      </div>
      <div className="grid divide-y divide-border/70 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="p-5 sm:p-6">
          <h3 className="font-semibold">Hợp đồng & khoản thu</h3>
          <p className="mt-1 text-sm text-muted-foreground">Theo dõi kỳ sử dụng, tái ký và chứng từ khoản thu.</p>
        </div>
        <div className="p-5 sm:p-6">
          <h3 className="font-semibold">Phiếu chi hoa hồng</h3>
          <p className="mt-1 text-sm text-muted-foreground">Theo dõi lập phiếu, phê duyệt và ghi nhận thanh toán.</p>
        </div>
      </div>
    </section>
  </div>;
}
