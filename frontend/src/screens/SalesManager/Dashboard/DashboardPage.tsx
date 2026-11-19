'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Activity,CalendarClock,ClipboardList,FileCheck2,RefreshCw,Send,Undo2,Building2,Handshake,TrendingUp} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Line,LineChart,XAxis,YAxis} from 'recharts';
import {AppStatCard} from '@/components/common/app-stat-card';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AppButton} from '@/components/common/buttons/app-button';
import {Input} from '@/components/ui/input';
import {ChartContainer,ChartTooltip,ChartTooltipContent} from '@/components/ui/chart';
import {channelRequest,currentBusinessPeriod} from '@/lib/channel-operations';
import type {SchoolOperationsReport} from '@/lib/school-operations';
import type {ManagerPageProps} from '@/types/manager-pages';

type ManagerOverview={
  pending_proposals:number;pending_invitations:number;pending_extensions:number;
  pending_contracts:number;awaiting_checkee:number;needs_revision:number;verified_contracts:number;
};
const activityConfig={
  registrations:{label:'Đăng ký tiếp cận',color:'var(--chart-1)'},
  contracts_signed:{label:'Hợp đồng đã ký',color:'var(--chart-2)'},
};
const allocationConfig={count:{label:'Lời mời',color:'var(--chart-1)'}};
const monthLabel=(period:string)=>{const [year,month]=period.split('-');return 'T'+Number(month)+'/'+year.slice(-2);};
const number=(value:number)=>value.toLocaleString('vi-VN');

export function DashboardPage({apiBase,token,abilities}:ManagerPageProps){
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.allocation.manage');
  const connected=!!apiBase&&!!token&&allowed;
  const [period,setPeriod]=useState(currentBusinessPeriod);
  const overview=useQuery({
    queryKey:['sales-manager-overview-aggregated',token],
    enabled:connected,
    queryFn:()=>channelRequest<ManagerOverview>(apiBase,token,'/manager/overview')
  });
  const report=useQuery({
    queryKey:['sales-manager-report',token,period],
    enabled:connected&&/^\d{4}-(0[1-9]|1[0-2])$/.test(period),
    queryFn:()=>channelRequest<SchoolOperationsReport>(apiBase,token,'/school-operations/report?period='+period)
  });
  if(!allowed)return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">Tài khoản không có quyền Quản lý bán hàng.</p>;

  const summary=overview.data;
  const tiles=[
    {label:'Gia hạn chờ duyệt',value:summary?.pending_extensions,icon:CalendarClock},
    {label:'Hợp đồng chờ rà soát',value:summary?.pending_contracts,icon:FileCheck2},
    {label:'Lời mời chờ phản hồi',value:summary?.pending_invitations,icon:Send},
    {label:'Hồ sơ cần bổ sung',value:summary?.needs_revision,icon:Undo2},
  ];
  const activities=report.data?.activity_trend??[];
  const performance=report.data?.allocation_performance??[];
  // The backend returns at most 200 authorised manager-assignee rows for the selected month.
  // Do not present totals as exhaustive when the server-side cap has been reached.
  const limited=performance.length>=200;
  const allocation=[
    {label:'Đã nhận',count:performance.reduce((sum,row)=>sum+row.accepted,0)},
    {label:'Từ chối',count:performance.reduce((sum,row)=>sum+row.declined,0)},
    {label:'Đã hủy',count:performance.reduce((sum,row)=>sum+row.cancelled,0)},
  ];
  const allocationCount=allocation.reduce((sum,row)=>sum+row.count,0);
  const ongoing=[
    {label:'Đề xuất chờ Quản lý',value:summary?.pending_proposals,icon:ClipboardList},
    {label:'Đang chờ CHECKEE',value:summary?.awaiting_checkee,icon:Building2},
    {label:'Hợp đồng đã xác minh',value:summary?.verified_contracts,icon:Handshake},
    {label:'Đề xuất quá hạn',value:report.data?.overdue_proposals,icon:TrendingUp},
    {label:'Gia hạn quá hạn',value:report.data?.overdue_extensions,icon:Activity},
  ];
  const refresh=()=>{void overview.refetch();void report.refetch();};
  return <div className="space-y-5">
    <AppPageHeader eyebrow="QUẢN LÝ BÁN HÀNG / KIDSFIT CRM"
      title="Tổng quan đội ngũ" description="Theo dõi đề xuất, phân bổ, gia hạn và hợp đồng trong phạm vi quản lý."
      actions={<div className="flex flex-wrap items-center gap-2">
        <label htmlFor="manager-dashboard-period" className="text-sm font-medium">Kỳ báo cáo</label>
        <Input id="manager-dashboard-period" type="month" value={period} onChange={e=>setPeriod(e.currentTarget.value)}
          className="h-10 w-40 rounded-xl"/>
        <AppButton tone="outline" disabled={!connected||overview.isFetching||report.isFetching}
          onClick={refresh} leadingIcon={<RefreshCw className="size-4"/>}>Làm mới</AppButton>
      </div>}/>
    {!connected&&<p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Chưa kết nối dữ liệu để hiển thị báo cáo.</p>}
    {(overview.isError||report.isError)&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-card p-4 text-sm text-destructive">
      <span>Không tải được một phần dữ liệu quản lý. Vui lòng kiểm tra kết nối và phân quyền.</span>
      <AppButton tone="neutral" onClick={refresh}>Thử lại</AppButton>
    </div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={overview.isFetching}>
      {tiles.map(({label,value,icon})=><AppStatCard key={label} label={label}
        value={connected&&typeof value==='number'?value:'—'} icon={icon}/>)}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 xl:col-span-2">
        <h2 className="text-base font-bold">Xu hướng tiếp cận và hợp đồng</h2>
        <p className="mt-1 text-xs text-muted-foreground">Lượt đăng ký tiếp cận và hợp đồng ký theo tháng · 6 tháng đến kỳ đã chọn</p>
        {connected&&report.isSuccess&&activities.length>0
          ? <ChartContainer config={activityConfig} className="mt-4 h-[275px] w-full">
              <LineChart accessibilityLayer data={activities} margin={{top:12,right:14,bottom:8,left:0}}>
                <CartesianGrid strokeDasharray="4 4" vertical={false}/>
                <XAxis dataKey="period" tickFormatter={monthLabel} tickLine={false} axisLine={false}/>
                <YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false}/>
                <ChartTooltip content={<ChartTooltipContent labelFormatter={label=>monthLabel(String(label))}/>}/>
                <Line type="monotone" dataKey="registrations" name="Đăng ký tiếp cận" stroke="var(--color-registrations)" strokeWidth={2.5} dot={{r:2}}/>
                <Line type="monotone" dataKey="contracts_signed" name="Hợp đồng đã ký" stroke="var(--color-contracts_signed)" strokeWidth={2.5} dot={{r:2}}/>
              </LineChart>
            </ChartContainer>
          :<div className="mt-4 flex h-[275px] items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {report.isFetching?'Đang tải xu hướng hoạt động…':report.isError?'Không tải được dữ liệu biểu đồ.':'Chưa có dữ liệu xu hướng trong phạm vi được cấp quyền.'}
          </div>}
        {activities.length>0&&report.isSuccess&&<div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>● Đăng ký tiếp cận</span><span>● Hợp đồng đã ký</span>
        </div>}
      </section>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-bold">Kết quả lời mời phân bổ</h2>
        <p className="mt-1 text-xs text-muted-foreground">Lời mời trong kỳ {period||'đã chọn'} · Không bao gồm lời mời đang chờ/hết hạn</p>
        {connected&&report.isSuccess&&allocationCount>0
          ?<ChartContainer config={allocationConfig} className="mt-4 h-[275px] w-full">
            <BarChart accessibilityLayer data={allocation} layout="vertical" margin={{top:10,right:14,bottom:10,left:10}}>
              <CartesianGrid horizontal={false} strokeDasharray="4 4"/>
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false}/>
              <YAxis type="category" dataKey="label" width={72} tickLine={false} axisLine={false}/>
              <ChartTooltip content={<ChartTooltipContent/>}/>
              <Bar dataKey="count" name="Lời mời" fill="var(--color-count)" radius={[0,6,6,0]} maxBarSize={32}/>
            </BarChart>
          </ChartContainer>
          :<div className="mt-4 flex h-[275px] items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {report.isFetching?'Đang tải kết quả phân bổ…':report.isError?'Không tải được dữ liệu biểu đồ.':'Chưa có lời mời đã nhận, từ chối hoặc hủy trong kỳ.'}
          </div>}
        {allocationCount>0&&report.isSuccess&&<div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {allocation.map(row=><div key={row.label} className="flex justify-between gap-2"><span>{row.label}</span><span className="font-semibold tabular-nums">{number(row.count)}</span></div>)}
          {limited&&<p role="status" className="pt-2 text-amber-700 dark:text-amber-300">Biểu đồ chỉ bao gồm tối đa 200 nhóm phân bổ đầu tiên do API giới hạn; không phải tổng toàn kỳ.</p>}
        </div>}
      </section>
    </div>
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-base font-bold">Công việc và chỉ số cần theo dõi</h2>
      <p className="mt-1 text-xs text-muted-foreground">Số liệu trong phạm vi quyền Quản lý. Mốc quá hạn phản ánh trạng thái hiện tại, không phụ thuộc kỳ báo cáo.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ongoing.map(({label,value,icon:Icon})=><div key={label} className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-2"><span className="text-xs text-muted-foreground">{label}</span><Icon aria-hidden="true" className="size-4 shrink-0 text-primary"/></div>
          <p className="mt-2 text-xl font-bold tabular-nums">{connected&&typeof value==='number'?number(value):'—'}</p>
        </div>)}
      </div>
    </section>
  </div>;
}
