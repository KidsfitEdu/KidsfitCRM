'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {ArrowUpRight,CalendarClock,ClipboardList,FileCheck2,Handshake,RefreshCw,ShieldAlert,UsersRound} from 'lucide-react';
import {CartesianGrid,Line,LineChart,Pie,PieChart,XAxis,YAxis} from 'recharts';
import {AdminIconAction} from '@/components/common/admin-list-ui';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AppStatCard} from '@/components/common/app-stat-card';
import {AppButton} from '@/components/common/buttons/app-button';
import {AppMonthPicker} from '@/components/common/forms/app-month-picker';
import {ChartContainer,ChartTooltip,ChartTooltipContent} from '@/components/ui/chart';
import {channelRequest,currentBusinessPeriod} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';

type SalesDashboardReport={
  period:string;server_time:string;active_approaches:number;expiring_soon:number;
  pending_invitations:number;pending_proposals:number;contracts_needs_revision:number;
  contracts_signed_period:number;
  protection_breakdown:{approaching:number;contracted:number};
  activity_trend:{period:string;registrations:number;contracts_signed:number}[];
};
const trendConfig={
  registrations:{label:'Đăng ký tiếp cận',color:'var(--chart-1)'},
  contracts_signed:{label:'Hợp đồng ký mới',color:'var(--chart-2)'}
};
const protectionConfig={
  approaching:{label:'Đang tiếp cận',color:'var(--chart-1)'},
  contracted:{label:'Bảo vệ hợp đồng',color:'var(--chart-2)'}
};
const formatMonth=(period:string)=>{const [year,month]=period.split('-');return 'T'+Number(month)+'/'+year.slice(-2);};
const formatNumber=(value:number)=>value.toLocaleString('vi-VN');

/** Sales-only dashboard: all metrics originate from an authorized and unpaginated API. */
export function SalesDashboard({apiBase,token,abilities,onSalesNavigate,onChanged}:RolePageProps){
  const [period,setPeriod]=useState(currentBusinessPeriod);
  const permitted=abilities.includes('*')||abilities.includes('channel_sales.customer.view');
  const connected=Boolean(apiBase&&token&&permitted);
  const report=useQuery({
    queryKey:['sales-dashboard-report',apiBase,token,period],
    enabled:connected&&/^\d{4}-(0[1-9]|1[0-2])$/.test(period),
    queryFn:()=>channelRequest<SalesDashboardReport>(apiBase,token,'/dashboard/report?period='+period)
  });
  const data=report.data;
  const show=(value:number|undefined)=>data&&typeof value==='number'?value:'—';
  const refresh=()=>{void report.refetch();void onChanged?.();};
  const go=(view:'role-sales-staff-customers'|'role-sales-staff-proposals')=>onSalesNavigate?.(view);
  const cards=[
    {label:'Trường đang tiếp cận',value:data?.active_approaches,icon:Handshake,description:'Quyền tiếp cận còn hiệu lực · hiện tại'},
    {label:'Sắp hết hạn',value:data?.expiring_soon,icon:CalendarClock,description:'Quyền tiếp cận hết hạn trong 24 giờ'},
    {label:'Hợp đồng ký trong kỳ',value:data?.contracts_signed_period,icon:FileCheck2,description:'Theo ngày ký hợp đồng · kỳ đã chọn'},
    {label:'Lời mời chờ phản hồi',value:data?.pending_invitations,icon:UsersRound,description:'Lời mời còn hạn · hiện tại'}
  ];
  const distribution=[
    {key:'approaching',name:'Đang tiếp cận',value:data?.protection_breakdown.approaching??0,fill:'var(--color-approaching)'},
    {key:'contracted',name:'Bảo vệ hợp đồng',value:data?.protection_breakdown.contracted??0,fill:'var(--color-contracted)'}
  ];
  const distributionTotal=distribution.reduce((sum,item)=>sum+item.value,0);
  const tasks=[
    {label:'Lời mời phân bổ',detail:'Cần nhận hoặc từ chối',value:data?.pending_invitations,icon:UsersRound,target:'role-sales-staff-customers' as const},
    {label:'Trường sắp hết hạn',detail:'Ghi nhận tiến độ hoặc xin gia hạn',value:data?.expiring_soon,icon:ShieldAlert,target:'role-sales-staff-customers' as const},
    {label:'Đề xuất đang xử lý',detail:'Chờ Quản lý hoặc Admin phản hồi',value:data?.pending_proposals,icon:ClipboardList,target:'role-sales-staff-proposals' as const},
    {label:'Hợp đồng cần bổ sung',detail:'Kiểm tra yêu cầu điều chỉnh',value:data?.contracts_needs_revision,icon:FileCheck2,target:'role-sales-staff-customers' as const}
  ];
  if(!permitted)return <p role="alert" className="rounded-xl border border-border p-5 text-sm text-destructive">Tài khoản chưa có quyền xem tổng quan bán hàng.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BÁN HÀNG / KIDSFIT CRM" title="Tổng quan bán hàng"
      description="Theo dõi hiệu suất tiếp cận, hợp đồng và các công việc cần xử lý."
      actions={<div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Kỳ báo cáo</span>
        <AppMonthPicker value={period} onChange={setPeriod} label="Kỳ báo cáo" allowAll={false} className="w-40"/>
        <AppButton tone="outline" leadingIcon={<RefreshCw className="size-4"/>}
          disabled={!connected||report.isFetching} onClick={refresh}>Làm mới</AppButton>
      </div>}/>
    {!connected&&<output className="block rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Chưa có kết nối để tải báo cáo Sales/CTV.</output>}
    {report.isError&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
      <span>Không tải được tổng quan bán hàng. Vui lòng kiểm tra kết nối hoặc quyền truy cập.</span>
      <AppButton type="button" tone="neutral" onClick={refresh}>Thử lại</AppButton>
    </div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={report.isFetching}>
      {cards.map(card=><AppStatCard key={card.label} label={card.label} value={show(card.value)} icon={card.icon} description={card.description}/>)}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 xl:col-span-2">
        <h3 className="text-base font-bold">Xu hướng tiếp cận và hợp đồng</h3>
        <p className="mt-1 text-xs text-muted-foreground">Số lượt đăng ký và số hợp đồng ký mới từng tháng · sáu tháng kết thúc tại {period}</p>
        {data&&data.activity_trend.length>0
          ?<ChartContainer config={trendConfig} className="mt-4 h-[280px] w-full">
            <LineChart accessibilityLayer data={data.activity_trend} margin={{top:12,right:16,bottom:8,left:0}}>
              <CartesianGrid strokeDasharray="4 4" vertical={false}/>
              <XAxis dataKey="period" tickFormatter={formatMonth} tickLine={false} axisLine={false}/>
              <YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false}/>
              <ChartTooltip content={<ChartTooltipContent labelFormatter={label=>formatMonth(String(label))}/>}/>
              <Line type="monotone" dataKey="registrations" name="Đăng ký tiếp cận"
                stroke="var(--color-registrations)" strokeWidth={2.5} dot={{r:2}}/>
              <Line type="monotone" dataKey="contracts_signed" name="Hợp đồng ký mới"
                stroke="var(--color-contracts_signed)" strokeWidth={2.5} dot={{r:2}}/>
            </LineChart>
          </ChartContainer>
          :<div className="mt-4 flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border px-5 text-center text-sm text-muted-foreground">
            {report.isFetching?'Đang tải xu hướng hoạt động…':'Chưa có dữ liệu xu hướng trong phạm vi được phân quyền.'}
          </div>}
        {data&&<div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span>Đăng ký tiếp cận</span><span>Hợp đồng ký mới</span></div>}
      </section>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="text-base font-bold">Cơ cấu trường đang phụ trách</h3>
        <p className="mt-1 text-xs text-muted-foreground">Quyền tiếp cận và quyền bảo vệ hợp đồng còn hiệu lực · hiện tại</p>
        {data&&distributionTotal>0
          ?<ChartContainer config={protectionConfig} className="mx-auto mt-4 h-[250px] w-full max-w-[320px]">
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent nameKey="name"/>}/>
              <Pie data={distribution} nameKey="name" dataKey="value" cx="50%" cy="50%"
                innerRadius={65} outerRadius={95} paddingAngle={2} strokeWidth={0}/>
            </PieChart>
          </ChartContainer>
          :<div className="mt-4 flex h-[250px] items-center justify-center rounded-xl border border-dashed border-border px-5 text-center text-sm text-muted-foreground">
            {report.isFetching?'Đang tải cơ cấu trường…':'Chưa có trường đang được bảo vệ.'}
          </div>}
        {data&&<div className="space-y-1 text-sm">
          {distribution.map(item=><div key={item.key} className="flex items-center justify-between gap-2">
            <span>{item.name}</span><strong className="tabular-nums">{formatNumber(item.value)}</strong>
          </div>)}
          <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold"><span>Tổng trường</span><span className="tabular-nums">{formatNumber(distributionTotal)}</span></div>
        </div>}
      </section>
    </div>
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <h3 className="flex items-center gap-2 font-bold"><ClipboardList className="size-5 text-primary" aria-hidden="true"/>Công việc cần xử lý</h3>
        <p className="mt-1 text-xs text-muted-foreground">Trạng thái hiện tại, không phụ thuộc kỳ báo cáo. Chỉ hiển thị hồ sơ thuộc tài khoản.</p>
      </div>
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-y-0">
        {tasks.map(task=><div key={task.label} className="flex min-w-0 items-center gap-3 border-b border-border p-4 sm:p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><task.icon className="size-5" aria-hidden="true"/></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{task.label}</p><p className="mt-1 text-xs text-muted-foreground">{task.detail}</p></div>
          <span className="rounded-full border border-border bg-muted px-2 py-1 text-sm font-semibold tabular-nums">{show(task.value)}</span>
          {onSalesNavigate&&<AdminIconAction icon={ArrowUpRight} label={'Mở '+task.label} onClick={()=>go(task.target)}/>}
        </div>)}
      </div>
    </section>
  </div>;
}
