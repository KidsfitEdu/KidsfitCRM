'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { SchoolOperations } from '@/components/crm/school-operations';
import { channelRequest, currentBusinessPeriod } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace, SchoolOperationsReport } from '@/lib/school-operations';

export type ManagerSection = 'manager-dashboard' | 'manager-proposals' | 'manager-allocations' | 'manager-progress' | 'manager-extensions' | 'manager-team';
type Props={section:ManagerSection;apiBase:string;token:string;abilities:string[];onChanged:()=>Promise<void>};
const sections:Record<Exclude<ManagerSection,'manager-dashboard'|'manager-progress'|'manager-team'>,string>={
 'manager-proposals':'proposals','manager-allocations':'invitations','manager-extensions':'extensions'
};
export function SalesManagerWorkspace(props:Props) {
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000}}}));
 return <QueryClientProvider client={client}><ManagerContent {...props}/></QueryClientProvider>;
}
function ManagerContent({section,apiBase,token,abilities,onChanged}:Props) {
 const has=(permission:string)=>abilities.includes(permission)||abilities.includes('*');
 const allowed=has('channel_sales.school.allocation.manage');
 const overview=useQuery({
  queryKey:['sales-manager-overview',token],
  enabled:!!apiBase&&!!token&&allowed&&section==='manager-dashboard',
  queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1'),
 });
 const period=currentBusinessPeriod();
 const report=useQuery({
  queryKey:['sales-manager-report',token,period],
  enabled:!!apiBase&&!!token&&allowed&&section==='manager-dashboard',
  queryFn:()=>channelRequest<SchoolOperationsReport>(apiBase,token,'/school-operations/report?period='+period),
 });
 if(!allowed)return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">Tài khoản không có quyền Quản lý bán hàng.</p>;
 if(section==='manager-dashboard') {
   const data=overview.data; const metrics=[
    ['Đề xuất chờ Quản lý',data?.proposals.filter(x=>x.can_manager_review&&x.status==='PENDING_MANAGER').length],
    ['Lời mời chờ phản hồi',data?.invitations.filter(x=>x.status==='PENDING').length],
    ['Gia hạn chờ duyệt',data?.extensions.filter(x=>x.can_review&&x.status==='PENDING').length],
    ['Đề xuất quá hạn',report.data?.overdue_proposals],
    ['Gia hạn quá hạn',report.data?.overdue_extensions],
    ['Trường chưa đăng ký',report.data?.available_schools],
   ];
   return <div className="space-y-5">
    {(overview.error||report.error)&&<p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">Không tải được dữ liệu giám sát. Vui lòng kiểm tra kết nối và quyền truy cập.</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label,value])=><div key={label} className="rounded-2xl border bg-card p-5 shadow-sm"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold">{typeof value==='number'?value.toLocaleString('vi-VN'):'—'}</p></div>)}</div>
    <div className="rounded-2xl border bg-card p-5"><h3 className="font-semibold">Công việc cần xử lý</h3><p className="mt-2 text-sm text-muted-foreground">Tiếp nhận đề xuất CTV, theo dõi lời mời phân bổ và duyệt gia hạn trước khi quyền tiếp cận hết hiệu lực. Hồ sơ đang chờ không tự giữ quyền.</p></div>
   </div>;
 }
 if(section==='manager-progress'||section==='manager-team')return <SchoolOperations key={section} apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged} initialTab={section==='manager-progress'?'report':'report'} hideTabs/>;
 return <SchoolOperations key={section} apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged} initialTab={sections[section]} hideTabs/>;
}
