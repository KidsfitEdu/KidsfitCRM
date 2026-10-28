'use client';

import type { ComponentProps } from 'react';
import { ShieldCheck, ClipboardCheck } from 'lucide-react';
import { ChannelOperations } from '@/components/crm/channel-operations';
import { ChannelSalesView } from '@/components/crm/channel-sales-view';
import type { ChannelSalesWorkspace } from '@/lib/channel-sales';

type Props={apiBase:string;token:string;abilities:string[];workspace:ChannelSalesWorkspace;onChanged:()=>Promise<void>;
  search:string;setSearch:(value:string)=>void; onRegister:ComponentProps<typeof ChannelSalesView>['onRegister'];onAddActivity:ComponentProps<typeof ChannelSalesView>['onAddActivity'];onReportContract:ComponentProps<typeof ChannelSalesView>['onReportContract'];onRecordRevenue:ComponentProps<typeof ChannelSalesView>['onRecordRevenue']};
export function BoardWorkspace(props:Props) {
 const can=(code:string)=>props.abilities.includes(code)||props.abilities.includes('*');
 return <section className="space-y-5">
  <div className="rounded-2xl border bg-card p-5 shadow-sm">
   <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary"/><h2 className="text-lg font-semibold">Ban giám đốc</h2></div>
   <p className="mt-1 text-sm text-muted-foreground">Không gian nghiệp vụ theo quyền của tài khoản và phạm vi tổ chức.</p>
   <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-sm"><ClipboardCheck className="mt-0.5 size-4 shrink-0 text-primary"/><span>Giám sát hồ sơ quá hạn và tranh chấp</span></div><div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-sm"><ClipboardCheck className="mt-0.5 size-4 shrink-0 text-primary"/><span>Xem báo cáo vận hành theo phạm vi</span></div><div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-sm"><ClipboardCheck className="mt-0.5 size-4 shrink-0 text-primary"/><span>Rà soát chính sách chờ phê duyệt</span></div></div>
  </div>
  {!can('channel_sales.school.escalation.resolve') && <p role="status" className="rounded-xl border p-3 text-sm text-muted-foreground">Một số thao tác cần quyền nghiệp vụ riêng. Chức năng chỉ được mở khi API cấp quyền phù hợp.</p>}
  <ChannelOperations apiBase={props.apiBase} token={props.token} abilities={props.abilities} onChanged={props.onChanged} allowedPanels={["operations","reconciliation"]} initialPanel="operations" initialOperationsTab="disputes"
   customerView={(onOpenCustomer)=><ChannelSalesView onOpenCustomer={onOpenCustomer} workspace={props.workspace} search={props.search} setSearch={props.setSearch}
     canRegister={can('channel_sales.approach.register')} canAddActivity={can('channel_sales.activity.create')}
     canReportContract={can('channel_sales.contract.report')} canRecordRevenue={can('channel_sales.revenue.record')}
     onRegister={props.onRegister} onAddActivity={props.onAddActivity} onReportContract={props.onReportContract} onRecordRevenue={props.onRecordRevenue}/>}/>
 </section>;
}
