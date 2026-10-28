'use client';
import { useState } from 'react';
import type { ComponentProps } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChannelOperations } from '@/components/crm/channel-operations';
import { ChannelSalesView } from '@/components/crm/channel-sales-view';
import type { ChannelSalesWorkspace } from '@/lib/channel-sales';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';

const sections = {
  'dashboard': {label:'Tổng quan',panel:'dashboard',tab:''},
  'schools': {label:'Đăng ký trường',panel:'schools',tab:''},
  'proposals': {label:'Đề xuất trường',panel:'operations',tab:'proposals'},
  'invitations': {label:'Nhận phân bổ',panel:'operations',tab:'invitations'},
  'approaches': {label:'Tiếp cận & tư vấn',panel:'customers',tab:''},
  'extensions': {label:'Gia hạn',panel:'operations',tab:'extensions'},
  'income': {label:'Hoa hồng',panel:'finance',tab:''},
} as const;
export type RoleSection = keyof typeof sections;
type Props = {
  section: RoleSection;
  apiBase: string;
  token: string;
  abilities: string[];
  workspace: ChannelSalesWorkspace;
  onChanged: () => Promise<void>;
  search: string;
  setSearch: (value: string) => void;
  onRegister: ComponentProps<typeof ChannelSalesView>['onRegister'];
  onAddActivity: ComponentProps<typeof ChannelSalesView>['onAddActivity'];
  onReportContract: ComponentProps<typeof ChannelSalesView>['onReportContract'];
  onRecordRevenue: ComponentProps<typeof ChannelSalesView>['onRecordRevenue'];
};

export function CollaboratorWorkspace(props: Props) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } }));
  return <QueryClientProvider client={queryClient}><RoleContent {...props} /></QueryClientProvider>;
}

function RoleContent(props: Props) {
  const { section, apiBase, token, abilities, workspace } = props;
  const can = (permission: string) => abilities.includes(permission) || abilities.includes('*');
  const active = sections[section];
  const preview = !apiBase;
  const operations = useQuery({
    queryKey: ['collaborator-summary', token],
    queryFn: () => channelRequest<SchoolOperationsWorkspace>(apiBase, token, '/school-operations?page=1'),
    enabled: !preview && !!token && section === 'dashboard' && can('channel_sales.customer.view'),
  });
  const metrics = workspace.metrics;
  const panelClass = 'rounded-2xl border bg-card p-5 shadow-sm';
  const format = (value: number | null | undefined) => typeof value === 'number' ? value.toLocaleString('vi-VN') : '—';
  if (!active) return <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>;
  if (section === 'dashboard') {
    const summary = operations.data;
    const tiles: [string, number | undefined][] = [
      ['Chưa đăng ký', metrics.available],
      ['Đang tiếp cận', metrics.approaching],
      ['Đã ký hợp đồng', metrics.contracted],
      ['Sắp hết hạn tiếp cận', metrics.expiring_soon],
      ['Đề xuất chờ xử lý', summary?.proposals.filter(p => p.status.startsWith('PENDING_')).length],
      ['Gia hạn chờ xử lý', summary?.extensions.filter(e => e.status === 'PENDING').length],
    ];
    return <div className="space-y-5">
      {preview && <p className="rounded-xl border bg-muted/50 p-3 text-sm text-muted-foreground">Dữ liệu xem thử, không có quyền ghi vào hệ thống thật.</p>}
      {operations.error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="size-4"/>{operations.error.message}</p>}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{tiles.map(([label, value]) =>
        <div className={panelClass} key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold">{preview ? '—' : format(value)}</p></div>
      )}</div>
      <div className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Công việc cần xử lý</h3><Button variant="outline" disabled={preview || operations.isFetching} onClick={() => void operations.refetch()}><RefreshCw className="mr-2 size-4"/>Làm mới</Button></div>
        <p className="mt-2 text-sm text-muted-foreground">Các số liệu phản ánh dữ liệu tài khoản được API cho phép truy cập. Mở menu bên trái để xem hồ sơ và thực hiện thao tác đúng thẩm quyền.</p>
      </div>
    </div>;
  }
  const allowedPanels = [...new Set(Object.values(sections).filter(s => s.panel !== 'dashboard').map(s => s.panel))] as ComponentProps<typeof ChannelOperations>['allowedPanels'];
  return <div className="space-y-5">
    <ChannelOperations key={section} apiBase={apiBase} token={token} abilities={abilities} onChanged={props.onChanged}
      initialPanel={active.panel === 'dashboard' ? 'customers' : active.panel} initialOperationsTab={active.tab || undefined}
      allowedPanels={allowedPanels} hideTabs hideOperationsTabs={active.panel === 'operations'}
      customerView={onOpenCustomer => <ChannelSalesView
        onOpenCustomer={onOpenCustomer} workspace={workspace} search={props.search} setSearch={props.setSearch}
        canRegister={can('channel_sales.approach.register')} canAddActivity={can('channel_sales.activity.create')}
        canReportContract={can('channel_sales.contract.report')} canRecordRevenue={can('channel_sales.revenue.record')}
        onRegister={props.onRegister} onAddActivity={props.onAddActivity} onReportContract={props.onReportContract}
        onRecordRevenue={props.onRecordRevenue}/>}
    />
  </div>;
}
