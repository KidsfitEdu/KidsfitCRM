'use client';

import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Building2,Clock3,ClipboardList,CheckCircle2,ShieldAlert,RefreshCw} from 'lucide-react';
import {CartesianGrid,Line,LineChart,Pie,PieChart,XAxis,YAxis} from 'recharts';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AppStatCard} from '@/components/common/app-stat-card';
import {AppButton} from '@/components/common/buttons/app-button';
import {AppMonthPicker} from '@/components/common/forms/app-month-picker';
import {ChartContainer,ChartTooltip,ChartTooltipContent} from '@/components/ui/chart';
import {channelRequest,currentBusinessPeriod} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';

type Summary={data:{schools:number;open_tickets:number;waiting_checkee:number;resolved_tickets:number;due_calls:number}};
type Report={
  period:string;
  status_breakdown:{open:number;in_progress:number;resolved:number};
  ticket_trend:{period:string;created:number;resolved:number}[];
};
const trendConfig={
  created:{label:'Ticket mới',color:'var(--chart-1)'},
  resolved:{label:'Ticket hoàn tất',color:'var(--chart-2)'},
};
const statusConfig={
  open:{label:'Mới nhận',color:'var(--chart-1)'},
  in_progress:{label:'Đang xử lý',color:'var(--chart-2)'},
  resolved:{label:'Hoàn tất',color:'var(--chart-3)'},
};
const monthLabel=(value:string)=>{const [year,month]=value.split('-');return 'T'+Number(month)+'/'+year.slice(-2);};

export function DashboardPage({apiBase,token,abilities,onSalesNavigate}:RolePageProps){
  const allowed=!apiBase||abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const connected=!!apiBase&&!!token&&allowed;
  const [period,setPeriod]=useState(currentBusinessPeriod);
  const query=useQuery({
    queryKey:['care-summary',apiBase,token],
    queryFn:()=>channelRequest<Summary>(apiBase,token,'/care/summary'),
    enabled:connected,
  });
  const report=useQuery({
    queryKey:['care-dashboard-report',apiBase,token,period],
    queryFn:()=>channelRequest<Report>(apiBase,token,'/care/dashboard/report?period='+period),
    enabled:connected&&/^\d{4}-(0[1-9]|1[0-2])$/.test(period),
  });
  if(!allowed)return <p role="alert" className="rounded-xl border border-border p-4 text-sm text-destructive">Không có quyền CSKH.</p>;
  const d=query.data?.data;
  const format=(value:number|undefined)=>connected&&typeof value==='number'?value:'—';
  const stats=[
    {label:'Trường phụ trách',value:d?.schools,icon:Building2,description:'Trường được phân công hiện tại'},
    {label:'Ticket đang mở',value:d?.open_tickets,icon:ClipboardList,description:'Cần theo dõi xử lý'},
    {label:'Lỗi chờ CHECKEE',value:d?.waiting_checkee,icon:ShieldAlert,description:'Đang chờ phản hồi kỹ thuật'},
    {label:'Lịch hẹn đến hạn',value:d?.due_calls,icon:Clock3,description:'Nhật ký hỗ trợ có lịch đến hạn'},
    {label:'Ticket hoàn tất',value:d?.resolved_tickets,icon:CheckCircle2,description:'Đã xử lý xong'},
  ];
  const items=report.data?.status_breakdown;
  const pie=[
    {key:'open',name:'Mới nhận',value:items?.open??0,fill:'var(--color-open)'},
    {key:'in_progress',name:'Đang xử lý',value:items?.in_progress??0,fill:'var(--color-in_progress)'},
    {key:'resolved',name:'Hoàn tất',value:items?.resolved??0,fill:'var(--color-resolved)'},
  ];
  const total=pie.reduce((sum,item)=>sum+item.value,0);
  const refresh=()=>{void query.refetch();void report.refetch();};
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Tổng quan chăm sóc"
      description="Theo dõi trường phụ trách, hướng dẫn sử dụng và xử lý lỗi phần mềm qua CHECKEE."
      actions={<div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Kỳ báo cáo</span>
        <AppMonthPicker label="Kỳ báo cáo" value={period} onChange={setPeriod} allowAll={false} className="w-[160px]"/>
        <AppButton tone="outline" leadingIcon={<RefreshCw className="size-4"/>}
          disabled={!connected||query.isFetching||report.isFetching} onClick={refresh}>Làm mới</AppButton>
      </div>}/>
    {!apiBase&&<output className="block rounded-xl border border-border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc; kết nối Backend để xem dữ liệu thực tế.</output>}
    {(query.isError||report.isError)&&<div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
      <span>Không tải được báo cáo CSKH. Vui lòng kiểm tra kết nối hoặc quyền truy cập.</span>
      <AppButton tone="neutral" onClick={refresh}>Thử lại</AppButton>
    </div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-busy={query.isFetching}>
      {stats.map(item=><AppStatCard key={item.label} icon={item.icon} label={item.label}
        value={format(item.value)} description={item.description}/>)}
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3" aria-busy={report.isFetching}>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 xl:col-span-2">
        <h3 className="text-base font-bold">Xu hướng ticket theo tháng</h3>
        <p className="mt-1 text-xs text-muted-foreground">Ticket mới và ticket hoàn tất trong sáu tháng đến {period}</p>
        {report.data&&report.data.ticket_trend.length>0
          ?<ChartContainer config={trendConfig} className="mt-4 h-[280px] w-full">
            <LineChart accessibilityLayer data={report.data.ticket_trend} margin={{top:12,right:16,bottom:8,left:0}}>
              <CartesianGrid strokeDasharray="4 4" vertical={false}/>
              <XAxis dataKey="period" tickFormatter={monthLabel} tickLine={false} axisLine={false}/>
              <YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false}/>
              <ChartTooltip content={<ChartTooltipContent labelFormatter={label=>monthLabel(String(label))}/>}/>
              <Line type="monotone" dataKey="created" name="Ticket mới" stroke="var(--color-created)" strokeWidth={2.5} dot={{r:2}}/>
              <Line type="monotone" dataKey="resolved" name="Ticket hoàn tất" stroke="var(--color-resolved)" strokeWidth={2.5} dot={{r:2}}/>
            </LineChart>
          </ChartContainer>
          :<div className="mt-4 flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
            {report.isFetching?'Đang tải xu hướng ticket…':'Chưa có dữ liệu xu hướng trong phạm vi được phân quyền.'}
          </div>}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Ticket mới</span><span>Ticket hoàn tất</span>
        </div>
      </section>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h3 className="text-base font-bold">Trạng thái ticket hiện tại</h3>
        <p className="mt-1 text-xs text-muted-foreground">Cơ cấu theo quyền CSKH, không phụ thuộc kỳ báo cáo</p>
        {report.data&&total>0
          ?<ChartContainer config={statusConfig} className="mx-auto mt-4 h-[250px] w-full max-w-[320px]">
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent nameKey="name"/>}/>
              <Pie data={pie} nameKey="name" dataKey="value" cx="50%" cy="50%"
                innerRadius={62} outerRadius={93} paddingAngle={2} strokeWidth={0}/>
            </PieChart>
          </ChartContainer>
          :<div className="mt-4 flex h-[250px] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
            {report.isFetching?'Đang tải cơ cấu ticket…':'Chưa có ticket để thống kê.'}
          </div>}
        {report.data&&<div className="space-y-2 text-sm">
          {pie.map(item=><div key={item.key} className="flex items-center justify-between gap-3">
            <span>{item.name}</span><strong className="tabular-nums">{item.value.toLocaleString('vi-VN')}</strong>
          </div>)}
          <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
            <span>Tổng ticket</span><span className="tabular-nums">{total.toLocaleString('vi-VN')}</span>
          </div>
        </div>}
      </section>
    </div>
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="font-semibold">Thao tác nhanh</h3>
      <div className="mt-3 flex flex-wrap gap-3">
        <AppButton tone="outline" onClick={()=>onSalesNavigate?.('role-customer-care-customers')}>Trường phụ trách · Ghi nhật ký</AppButton>
        <AppButton tone="outline" onClick={()=>onSalesNavigate?.('role-customer-care-cases')}>Theo dõi ticket lỗi hệ thống</AppButton>
      </div>
    </section>
    <p className="text-xs text-muted-foreground">Năm KPI và cơ cấu trạng thái là số liệu hiện tại. Bộ chọn kỳ chỉ áp dụng cho xu hướng sáu tháng; lịch hẹn đến hạn theo nhật ký hỗ trợ đã ghi.</p>
  </div>;
}
