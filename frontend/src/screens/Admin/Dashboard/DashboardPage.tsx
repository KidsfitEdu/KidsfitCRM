'use client';

import {useCallback,useEffect,useState} from 'react';
import {Activity,AlertTriangle,Building2,FileCheck2,History,RefreshCw,UsersRound} from 'lucide-react';
import {CartesianGrid,Line,LineChart,Pie,PieChart,XAxis,YAxis} from 'recharts';
import {AppStatCard} from '@/components/common/app-stat-card';
import {AppMonthPicker} from '@/components/common/forms/app-month-picker';
import {AppPageHeader} from '@/components/common/app-page-header';
import {ChartContainer,ChartTooltip,ChartTooltipContent} from '@/components/ui/chart';
import {fetchAdminReport} from '@/services/report.service';
import {fetchAdminOperations} from '@/services/proposal.service';
import type {SchoolOperationsReport,SchoolOperationsWorkspace} from '@/lib/school-operations';
import {appNotice} from '@/components/common/app-toast-provider';
import {AdminPageStatus} from '@/components/admin/AdminPageStatus';
import {currentBusinessPeriod} from '@/lib/channel-operations';
import type {AdminPageProps} from '../types';

const trendConfig={
  registrations:{label:'Tiếp cận mới',color:'var(--chart-3)'},
  contracts_signed:{label:'Hợp đồng ký mới',color:'var(--chart-1)'},
};
const schoolConfig={
  available:{label:'Chưa đăng ký',color:'var(--chart-1)'},
  approaching:{label:'Đang tiếp cận',color:'var(--chart-2)'},
  contracted:{label:'Bảo vệ hợp đồng',color:'var(--chart-3)'},
};
const labelMonth=(period:string)=>{const [year,month]=period.split('-');return 'T'+Number(month)+'/'+year.slice(-2);};
const activityLabels:Record<string,string>={
  SchoolProposal:'Đề xuất trường',ApproachRegistration:'Đăng ký tiếp cận',
  SalesContract:'Hợp đồng',SchoolInvitation:'Phân bổ trường',
};
const fmt=(n:number|null|undefined)=>n==null?'—':n.toLocaleString('vi-VN');
const fmtTime=(value:string)=>new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));

export function DashboardPage({apiBase,token,workspace}:AdminPageProps) {
  const [period,setPeriod]=useState(currentBusinessPeriod);
  const [report,setReport]=useState<SchoolOperationsReport|null>(null);
  const [operations,setOperations]=useState<SchoolOperationsWorkspace|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(false);
  const preview=!apiBase||!token;

  const reload=useCallback(async()=>{
    if(preview)return;
    setLoading(true);setError(false);
    try {
      const [reportResult,operationsResult]=await Promise.all([
        fetchAdminReport(apiBase,token,period),
        fetchAdminOperations(apiBase,token,1,''),
      ]);
      setReport(reportResult);setOperations(operationsResult);
    } catch(e) {
      setError(true);setReport(null);
      appNotice.error('Không tải được dữ liệu tổng quan.',e instanceof Error?e.message:'Vui lòng thử lại.');
    } finally {setLoading(false);}
  },[apiBase,token,period,preview]);
  useEffect(()=>{void reload();},[reload]);

  const metrics=workspace.metrics;
  const pending=operations?.proposals.filter(x=>x.status==='PENDING_ADMIN').length??null;
  const mix=report?.school_statuses;
  const distribution=mix?[
    {key:'available',name:'Chưa đăng ký',value:report?.available_schools??0,fill:'var(--color-available)'},
    {key:'approaching',name:'Đang tiếp cận',value:mix.approaching,fill:'var(--color-approaching)'},
    {key:'contracted',name:'Bảo vệ hợp đồng',value:mix.contracted,fill:'var(--color-contracted)'},
  ]:[];
  const schoolTotal=distribution.reduce((sum,x)=>sum+x.value,0);
  const trend=report?.activity_trend??[];
  const trendHasData=trend.some(x=>x.registrations>0||x.contracts_signed>0);
  const cards=[
    {label:'Tổng trường học',value:preview?null:metrics.available+metrics.approaching+metrics.contracted,icon:Building2,description:'Danh bạ tại thời điểm hiện tại'},
    {label:'Chưa đăng ký',value:report?.available_schools,icon:Building2,description:'Trường khả dụng hiện tại'},
    {label:'Đang tiếp cận',value:mix?.approaching,icon:UsersRound,description:'Quyền bảo vệ tiếp cận đang hiệu lực'},
    {label:'Hợp đồng hiệu lực',value:report?.active_contracts,icon:FileCheck2,description:'Trạng thái tại thời điểm hiện tại'},
  ];
  const tasks=[
    {label:'Đề xuất chờ Admin',value:pending},
    {label:'Đề xuất quá hạn',value:report?.overdue_proposals},
    {label:'Tiếp cận hết hạn trong kỳ',value:report?.expired_approaches},
    {label:'Gia hạn quá hạn',value:report?.overdue_extensions},
  ];
  const events=report?.recent_activity??[];

  return <AdminPageStatus apiBase={apiBase}>
    <div className="min-w-0 space-y-5">
      <AppPageHeader eyebrow="QUẢN TRỊ / KIDSFIT CRM" title="Tổng quan quản trị"
        description="Theo dõi tình hình trường học, hiệu quả vận hành và những hồ sơ cần xử lý."
        actions={<div className="flex items-center gap-2">
          <AppMonthPicker label="Kỳ báo cáo vận hành" value={period} onChange={setPeriod}
            allowAll={false} className="w-[168px]"/>
          <button type="button" aria-label="Làm mới báo cáo" title="Làm mới báo cáo"
            disabled={loading||preview} onClick={()=>{void reload();}}
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-primary hover:bg-muted disabled:opacity-50">
            <RefreshCw className="size-4" aria-hidden="true"/>
          </button>
        </div>}/>
      {loading&&<output className="block text-xs text-muted-foreground">Đang cập nhật báo cáo vận hành…</output>}
      {error&&<p role="alert" className="text-sm text-destructive">Không tải được dữ liệu báo cáo. Chọn Làm mới để thử lại.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
        {cards.map(item=><AppStatCard key={item.label} label={item.label} value={fmt(item.value)}
          description={item.description} icon={item.icon}/>)}
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5" aria-labelledby="admin-activity-chart">
          <h3 id="admin-activity-chart" className="text-base font-semibold">Xu hướng vận hành</h3>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">Lượt đăng ký tiếp cận và hợp đồng ký mới · 6 tháng đến kỳ được chọn</p>
          {trendHasData?
            <ChartContainer config={trendConfig} className="h-[270px] w-full">
              <LineChart accessibilityLayer data={trend} margin={{top:12,right:12,bottom:8,left:0}}>
                <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                <XAxis dataKey="period" tickFormatter={labelMonth} tickLine={false} axisLine={false}/>
                <YAxis allowDecimals={false} width={42} tickLine={false} axisLine={false}/>
                <ChartTooltip content={<ChartTooltipContent labelFormatter={value=>labelMonth(String(value))}/>}/>
                <Line type="monotone" dataKey="registrations" stroke="var(--color-registrations)" strokeWidth={2.5} dot={{r:3}}/>
                <Line type="monotone" dataKey="contracts_signed" stroke="var(--color-contracts_signed)" strokeWidth={2.5} dot={{r:3}}/>
              </LineChart>
            </ChartContainer>
          :<div className="flex h-[270px] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
            {loading?'Đang tải biểu đồ…':'Chưa có hoạt động phát sinh trong kỳ báo cáo.'}
          </div>}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[var(--chart-3)]"/>Tiếp cận mới</span>
            <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[var(--chart-1)]"/>Hợp đồng ký mới</span>
          </div>
        </section>
        <section className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5" aria-labelledby="admin-school-status">
          <h3 id="admin-school-status" className="text-base font-semibold">Cơ cấu trường học</h3>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">Snapshot quyền bảo vệ tại thời điểm hiện tại, không phải lịch sử tháng</p>
          {schoolTotal>0?
            <ChartContainer config={schoolConfig} className="mx-auto h-[230px] w-full max-w-[300px]">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent/>}/>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2}/>
              </PieChart>
            </ChartContainer>
          :<div className="flex h-[230px] items-center justify-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu cơ cấu trường học.
            </div>}
          <div className="mt-3 space-y-2">
            {distribution.map(x=><div key={x.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{backgroundColor:x.fill}}/>{x.name}</span>
              <span className="font-semibold tabular-nums">{fmt(x.value)}</span>
            </div>)}
          </div>
        </section>
      </div>
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-labelledby="admin-work-queue">
        <h3 id="admin-work-queue" className="flex items-center gap-2 text-base font-semibold"><AlertTriangle className="size-4 text-primary"/>Công việc cần xử lý</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tasks.map(x=><div key={x.label} className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">{x.label}</p>
            <p className="mt-2 text-xl font-bold tabular-nums">{fmt(x.value)}</p>
          </div>)}
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-labelledby="admin-recent-activity">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="admin-recent-activity" className="flex items-center gap-2 text-base font-semibold"><History className="size-4 text-primary"/>Nhật ký hoạt động gần đây</h3>
          <span className="text-xs text-muted-foreground">10 sự kiện mới nhất · Theo quyền Admin</span>
        </div>
        {events.length>0?<div className="mt-3 divide-y divide-border">
          {events.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium"><Activity className="mr-1 inline size-4 text-primary" aria-hidden="true"/>{activityLabels[x.entityType]??'Nghiệp vụ CRM'} · {x.action}</p>
              <p className="mt-1 text-xs text-muted-foreground">{x.actor_name} · Hồ sơ #{x.entityId}</p>
            </div>
            <time className="text-xs text-muted-foreground" dateTime={x.createdAt}>{fmtTime(x.createdAt)}</time>
          </div>)}
        </div>:<p className="mt-4 text-sm text-muted-foreground">
          {loading?'Đang tải nhật ký…':'Chưa có sự kiện gần đây hoặc tài khoản chưa được cấp quyền xem nhật ký.'}
        </p>}
      </section>
    </div>
  </AdminPageStatus>;
}
