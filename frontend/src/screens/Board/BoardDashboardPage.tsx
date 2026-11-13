'use client';

import { useState } from 'react';
import { AlertTriangle, Building2, FileCheck2, RefreshCw, Wallet } from 'lucide-react';
import { CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { useBoardData, currentBusinessPeriod, boardMoney, boardNumber } from './board-data';
import type { RolePageProps } from '@/types/role-pages';

const revenueChartConfig = {
  collected: {label:'Thực thu',color:'var(--chart-1)'},
  refunded: {label:'Hoàn tiền',color:'var(--chart-3)'},
  net: {label:'Thu ròng',color:'var(--chart-2)'},
};
const schoolChartConfig = {
  available: {label:'Chưa đăng ký',color:'var(--chart-1)'},
  approaching: {label:'Đang tiếp cận',color:'var(--chart-2)'},
  contracted: {label:'Đã ký hợp đồng',color:'var(--chart-3)'},
};
const monthLabel=(value:string)=>{
  const [year,month]=value.split('-');
  return 'T'+Number(month)+'/'+year.slice(-2);
};
function revenueComparison(current:number|null,previous:number|null){
  if(current===null||previous===null)return null;
  if(previous===0)return current===0?'Bằng kỳ trước':'Kỳ trước chưa có doanh thu';
  const percent=(current-previous)/Math.abs(previous)*100;
  const sign=percent>0?'+':'';
  return sign+percent.toLocaleString('vi-VN',{maximumFractionDigits:1})+'% so với tháng trước';
}

export function BoardDashboardPage({apiBase,token,abilities}:RolePageProps) {
  const [period,setPeriod] = useState(currentBusinessPeriod);
  const permitted = abilities.includes('*') || abilities.includes('channel_sales.school.escalation.resolve')
    || abilities.includes('channel_sales.school.dispute.resolve');
  // Operations list is intentionally not loaded: only four KPIs and two real-data charts.
  const {report,connected} = useBoardData(permitted?apiBase:'',token,period,1,false);
  const metrics = report.data;
  const trend = metrics?.revenue_trend??[];
  const financialAccess = !!metrics && metrics.net_collected_revenue!==null;
  const previousMonthComparison = revenueComparison(metrics?.net_collected_revenue??null,
    metrics?.previous_net_revenue??null);
  const statusMix = metrics?.school_statuses;
  const schoolMix = statusMix ? [
    {key:'available',label:'Chưa đăng ký',value:metrics?.available_schools??0,fill:'var(--color-available)'},
    {key:'approaching',label:'Đang tiếp cận',value:statusMix.approaching,fill:'var(--color-approaching)'},
    {key:'contracted',label:'Đã ký hợp đồng',value:statusMix.contracted,fill:'var(--color-contracted)'},
  ] : [];
  const schoolTotal=schoolMix.reduce((sum,group)=>sum+group.value,0);
  const alerts = metrics ? metrics.overdue_proposals+metrics.overdue_extensions : null;
  const cards = [
    {label:'Doanh thu thực thu ròng',value:financialAccess?boardMoney(metrics?.net_collected_revenue):'—',icon:Wallet,
      description:metrics?(financialAccess?previousMonthComparison??'Trong kỳ báo cáo':'Chưa được cấp quyền xem doanh thu'):undefined},
    {label:'Hợp đồng hiệu lực',value:boardNumber(metrics?.active_contracts),icon:FileCheck2,
      description:'Tại thời điểm hiện tại'},
    {label:'Trường còn khả dụng',value:boardNumber(metrics?.available_schools),icon:Building2,
      description:'Tại thời điểm hiện tại'},
    {label:'Hồ sơ quá hạn',value:boardNumber(alerts),icon:AlertTriangle,
      description:'Đề xuất và yêu cầu gia hạn quá hạn hiện tại'},
  ];
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Tổng quan điều hành"
      description="Doanh thu trong kỳ, tình hình trường học và những hồ sơ cần theo dõi."
      actions={<div className="flex flex-wrap items-center gap-2">
        <label htmlFor="board-dashboard-period" className="text-sm font-medium">Kỳ báo cáo</label>
        <Input id="board-dashboard-period" type="month" className="h-10 w-44 rounded-xl"
          value={period} onChange={event=>setPeriod(event.target.value)}/>
        <AdminIconAction icon={RefreshCw} label="Làm mới tổng quan điều hành"
          disabled={!connected||report.isFetching}
          onClick={()=>{void report.refetch();}}/>
      </div>}/>
    {!connected&&<output className="block rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
      {!apiBase?'Đang xem giao diện mẫu. Kết nối API để tải dữ liệu thực tế.':'Tài khoản không có quyền xem báo cáo điều hành.'}
    </output>}
    {report.error&&<div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <p>{report.error instanceof Error?report.error.message:'Không tải được báo cáo điều hành.'}</p>
      <button type="button" className="rounded-lg border border-border px-3 py-2 text-foreground"
        onClick={()=>void report.refetch()}>Thử lại</button>
    </div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={report.isFetching}>
      {cards.map(card=><AppStatCard key={card.label} {...card}/>)}
    </div>
    {report.isPending&&connected&&<output className="block text-sm text-muted-foreground">Đang tải dữ liệu báo cáo…</output>}
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 xl:col-span-2">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Xu hướng doanh thu theo tháng</h2>
          <p className="mt-1 text-xs text-muted-foreground">Thực thu, hoàn tiền và thu ròng · 6 tháng đến kỳ đã chọn · VNĐ</p>
        </div>
        {trend.length>0&&financialAccess
          ? <ChartContainer config={revenueChartConfig} className="h-[290px] w-full">
              <LineChart accessibilityLayer data={trend} margin={{top:12,right:10,bottom:8,left:0}}>
                <CartesianGrid vertical={false} strokeDasharray="4 4"/>
                <XAxis dataKey="period" tickFormatter={monthLabel} tickLine={false} axisLine={false}/>
                <YAxis width={70} tickLine={false} axisLine={false}
                  tickFormatter={value=>Number(value).toLocaleString('vi-VN',{notation:'compact',maximumFractionDigits:1})}/>
                <ChartTooltip content={<ChartTooltipContent
                  labelFormatter={value=>monthLabel(String(value))}
                  formatter={(value,name)=><span className="text-xs tabular-nums">
                    {revenueChartConfig[name as keyof typeof revenueChartConfig]?.label??name}: {boardMoney(Number(value))}
                  </span>}/>} />
                <Line type="monotone" dataKey="collected" stroke="var(--color-collected)" strokeWidth={2}
                  dot={false} activeDot={{r:4}}/>
                <Line type="monotone" dataKey="refunded" stroke="var(--color-refunded)" strokeWidth={2}
                  dot={false} activeDot={{r:4}}/>
                <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={3}
                  dot={{r:3}} activeDot={{r:5}}/>
              </LineChart>
            </ChartContainer>
          : <div className="flex h-[290px] items-center justify-center rounded-xl border border-dashed border-border px-5 text-center text-sm text-muted-foreground">
              {report.isFetching?'Đang tải xu hướng doanh thu…'
                : metrics&&!financialAccess?'Chưa có quyền xem số liệu doanh thu.'
                :'Chưa có dữ liệu doanh thu để hiển thị biểu đồ.'}
            </div>}
        {trend.length>0&&financialAccess&&<div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {[
            {label:'Thực thu',color:'var(--chart-1)'},
            {label:'Hoàn tiền',color:'var(--chart-3)'},
            {label:'Thu ròng',color:'var(--chart-2)'},
          ].map(item=><span key={item.label} className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{backgroundColor:item.color}}/>{item.label}
          </span>)}
        </div>}
      </section>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold">Cơ cấu trạng thái trường</h2>
        <p className="mt-1 text-xs text-muted-foreground">Trạng thái bảo vệ hiện tại · Không phụ thuộc kỳ báo cáo</p>
        {schoolMix.length>0&&schoolTotal>0
          ? <ChartContainer config={schoolChartConfig} className="mx-auto h-[230px] w-full max-w-[330px]">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent
                  formatter={(value,name)=><span className="text-xs">
                    {name}: {boardNumber(Number(value))} trường
                  </span>}/>} />
                <Pie data={schoolMix} dataKey="value" nameKey="label"
                  innerRadius={62} outerRadius={95} paddingAngle={2}/>
              </PieChart>
            </ChartContainer>
          : <div className="flex h-[230px] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              {report.isFetching?'Đang tải cơ cấu trường…':'Chưa có dữ liệu cơ cấu trường.'}
            </div>}
        {schoolTotal>0&&<div className="mt-2 space-y-2" aria-label="Chi tiết cơ cấu trường">
          {schoolMix.map(item=><div key={item.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{backgroundColor:item.fill}}/>
              {item.label}
            </span>
            <span className="font-semibold tabular-nums">{boardNumber(item.value)}</span>
          </div>)}
          <p className="pt-1 text-xs text-muted-foreground">Phân loại theo quyền bảo vệ còn hiệu lực; không phải số hợp đồng ký mới.</p>
        </div>}
      </section>
    </div>
  </div>;
}
