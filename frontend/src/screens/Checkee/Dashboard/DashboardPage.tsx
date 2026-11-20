'use client';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {BadgeCheck,Clock3,MessageSquareWarning,FileCheck2,RefreshCw,Wrench,Hourglass} from 'lucide-react';
import {CartesianGrid,Line,LineChart,Pie,PieChart,XAxis,YAxis} from 'recharts';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AppStatCard} from '@/components/common/app-stat-card';
import {AppButton} from '@/components/common/buttons/app-button';
import {AppMonthPicker} from '@/components/common/forms/app-month-picker';
import {ChartContainer,ChartTooltip,ChartTooltipContent} from '@/components/ui/chart';
import {channelRequest,currentBusinessPeriod} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';

type Report={period:string;
 verification:{pending:number;feedback:number;confirmed:number}|null;
 technical_support:{unresponded:number;awaiting_care:number;closed:number}|null;
 verification_trend:{period:string;received:number;confirmed:number}[]|null;
};
const trendConfig={received:{label:'Tiếp nhận',color:'var(--chart-1)'},confirmed:{label:'Đã xác minh',color:'var(--chart-2)'}};
const ticketConfig={unresponded:{label:'Chưa phản hồi',color:'var(--chart-1)'},awaiting_care:{label:'Chờ CSKH',color:'var(--chart-2)'},closed:{label:'Đã đóng',color:'var(--chart-3)'}};
const formatMonth=(p:string)=>{const [y,m]=p.split('-');return 'T'+Number(m)+'/'+y.slice(-2);};

export function DashboardPage({apiBase,token,abilities,onSalesNavigate}:RolePageProps){
 const [period,setPeriod]=useState(currentBusinessPeriod);
 const canVerify=abilities.includes('*')||abilities.includes('channel_sales.reconcile');
 const canSupport=abilities.includes('*')||abilities.includes('channel_sales.school.technical_support.handle');
 const allowed=!apiBase||canVerify||canSupport;
 const connected=!!apiBase&&!!token&&allowed;
 const report=useQuery({queryKey:['checkee-dashboard-report',apiBase,token,period],
   queryFn:()=>channelRequest<Report>(apiBase,token,'/checkee/dashboard/report?period='+period),
   enabled:connected&&/^\d{4}-(0[1-9]|1[0-2])$/.test(period)});
 if(!allowed)return <p role="alert" className="rounded-xl border border-border p-5 text-sm text-destructive">Không có quyền xem tổng quan CHECKEE.</p>;
 const v=report.data?.verification, t=report.data?.technical_support;
 const cards=[
  {label:'Chờ xác minh',value:canVerify?v?.pending:undefined,icon:Clock3,description:'Hồ sơ chờ CHECKEE xử lý'},
  {label:'Cần bổ sung',value:canVerify?v?.feedback:undefined,icon:MessageSquareWarning,description:'Đã phản hồi hồ sơ hợp đồng'},
  {label:'Đã xác minh',value:canVerify?v?.confirmed:undefined,icon:BadgeCheck,description:'Hợp đồng xác minh hợp lệ'},
  {label:'Ticket chưa phản hồi',value:canSupport?t?.unresponded:undefined,icon:Wrench,description:'Ticket cần phản hồi kỹ thuật'},
  {label:'Chờ CSKH xác nhận',value:canSupport?t?.awaiting_care:undefined,icon:Hourglass,description:'CHECKEE đã hoàn tất kỹ thuật'},
 ];
 const ticketRows=[
  {key:'unresponded',name:'Chưa phản hồi kỹ thuật',value:t?.unresponded??0,fill:'var(--color-unresponded)'},
  {key:'awaiting_care',name:'Chờ CSKH xác nhận',value:t?.awaiting_care??0,fill:'var(--color-awaiting_care)'},
  {key:'closed',name:'CSKH đã đóng',value:t?.closed??0,fill:'var(--color-closed)'},
 ];
 const total=ticketRows.reduce((n,row)=>n+row.value,0);
 return <div className="space-y-5">
   <AppPageHeader eyebrow="CHECKEE / KIDSFIT CRM" title="Tổng quan CHECKEE"
    description="Theo dõi xác minh hợp đồng và phản hồi hỗ trợ kỹ thuật."
    actions={<div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">Kỳ báo cáo</span>
      <AppMonthPicker label="Kỳ báo cáo" value={period} onChange={setPeriod} allowAll={false} className="w-[160px]"/>
      <AppButton tone="outline" leadingIcon={<RefreshCw className="size-4"/>}
        disabled={!connected||report.isFetching} onClick={()=>{void report.refetch();}}>Làm mới</AppButton>
    </div>}/>
   {!apiBase&&<output className="block rounded-xl border border-border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc. Kết nối Backend để xem số liệu thật.</output>}
   {report.isError&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">
     <span>Không tải được báo cáo CHECKEE. Vui lòng kiểm tra kết nối hoặc quyền truy cập.</span>
     <AppButton tone="neutral" onClick={()=>{void report.refetch();}}>Thử lại</AppButton>
   </div>}
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-busy={report.isFetching}>
     {cards.map(card=><AppStatCard key={card.label} icon={card.icon} label={card.label}
       value={typeof card.value==='number'?card.value:'—'} description={card.description}/>)}
   </div>
   <div className="grid grid-cols-1 gap-4 xl:grid-cols-3" aria-busy={report.isFetching}>
     <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 xl:col-span-2">
       <h3 className="text-base font-bold">Tiến độ xác minh hợp đồng</h3>
       <p className="mt-1 text-xs text-muted-foreground">Tiếp nhận và xác minh trong sáu tháng đến {period}</p>
       {canVerify&&report.data?.verification_trend?.length
        ?<ChartContainer config={trendConfig} className="mt-4 h-[280px] w-full">
          <LineChart accessibilityLayer data={report.data.verification_trend} margin={{top:12,right:16,bottom:8,left:0}}>
            <CartesianGrid strokeDasharray="4 4" vertical={false}/>
            <XAxis dataKey="period" tickFormatter={formatMonth} tickLine={false} axisLine={false}/>
            <YAxis allowDecimals={false} width={38} tickLine={false} axisLine={false}/>
            <ChartTooltip content={<ChartTooltipContent labelFormatter={x=>formatMonth(String(x))}/>}/>
            <Line type="monotone" dataKey="received" name="Tiếp nhận" stroke="var(--color-received)" strokeWidth={2.5} dot={{r:2}}/>
            <Line type="monotone" dataKey="confirmed" name="Đã xác minh" stroke="var(--color-confirmed)" strokeWidth={2.5} dot={{r:2}}/>
          </LineChart>
         </ChartContainer>
        :<div className="mt-4 flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          {!canVerify?'Không có quyền xem số liệu xác minh.':report.isFetching?'Đang tải xu hướng…':'Chưa có dữ liệu xác minh.'}
         </div>}
       <div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span>Tiếp nhận</span><span>Đã xác minh</span></div>
     </section>
     <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
       <h3 className="text-base font-bold">Trạng thái ticket kỹ thuật</h3>
       <p className="mt-1 text-xs text-muted-foreground">Cơ cấu hiện tại, không phụ thuộc kỳ báo cáo</p>
       {canSupport&&t&&total>0
        ?<ChartContainer config={ticketConfig} className="mx-auto mt-4 h-[250px] w-full max-w-[320px]">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent nameKey="name"/>}/>
            <Pie data={ticketRows} nameKey="name" dataKey="value" cx="50%" cy="50%"
              innerRadius={62} outerRadius={93} paddingAngle={2} strokeWidth={0}/>
          </PieChart>
         </ChartContainer>
        :<div className="mt-4 flex h-[250px] items-center justify-center rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          {!canSupport?'Không có quyền xem ticket kỹ thuật.':report.isFetching?'Đang tải ticket…':'Chưa có ticket kỹ thuật.'}
         </div>}
       {canSupport&&t&&<div className="space-y-2 text-sm">
         {ticketRows.map(row=><div key={row.key} className="flex items-center justify-between gap-2">
           <span>{row.name}</span><strong className="tabular-nums">{row.value.toLocaleString('vi-VN')}</strong>
         </div>)}
         <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Tổng ticket</span><span>{total.toLocaleString('vi-VN')}</span></div>
       </div>}
     </section>
   </div>
   <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
     <h3 className="font-semibold">Công việc CHECKEE</h3>
     <p className="mt-1 text-sm text-muted-foreground">Xem và phản hồi hồ sơ theo thẩm quyền được phân công.</p>
     <div className="mt-3 flex flex-wrap gap-3">
       {canVerify&&<AppButton tone="outline" disabled={!onSalesNavigate}
         onClick={()=>onSalesNavigate?.('role-checkee-verification')}
         leadingIcon={<FileCheck2 className="size-4"/>}>Xác minh hợp đồng</AppButton>}
       {canSupport&&<AppButton tone="outline" disabled={!onSalesNavigate}
         onClick={()=>onSalesNavigate?.('role-checkee-support')}
         leadingIcon={<Wrench className="size-4"/>}>Hỗ trợ kỹ thuật</AppButton>}
     </div>
   </section>
   <p className="text-xs text-muted-foreground">KPI và cơ cấu ticket hiển thị hiện tại; kỳ báo cáo chỉ áp dụng cho xu hướng xác minh.</p>
 </div>;
}
