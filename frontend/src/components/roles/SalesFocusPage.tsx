'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Plus } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { ChannelOperations } from '@/components/crm/channel-operations';
import { ChannelSalesView, type SalesCustomerMode } from '@/components/crm/channel-sales-view';
import { SalesIncomePage } from './SalesIncomePage';
import { ContractRenewalSalesPanel } from './ContractRenewalSalesPanel';
import { SalesProtectionOverview } from '@/components/crm/SalesProtectionOverview';
import type { RolePageProps } from '@/types/role-pages';

type SalesSection = 'schools' | 'customers' | 'activities' | 'proposals' | 'income';
type Panel = NonNullable<ComponentProps<typeof ChannelOperations>['initialPanel']>;

const copy: Record<SalesSection, {title:string;description:string}> = {
  schools: {
    title: 'Danh sách trường',
    description: 'Tra cứu trường chính, phân hiệu và đăng ký tiếp cận trường còn khả dụng.',
  },
  customers: {
    title: 'Trường của tôi',
    description: 'Quản lý trường đang phụ trách, tiếp nhận phân bổ và hồ sơ hợp đồng tái ký.',
  },
  activities: {
    title: 'Tiếp cận & tư vấn',
    description: 'Cập nhật cuộc gọi, buổi gặp, lịch hẹn, báo cáo hợp đồng và đề nghị gia hạn.',
  },
  proposals: {
    title: 'Đề xuất trường',
    description: 'Gửi trường chưa có trong danh bạ qua Quản lý bán hàng để Admin xem xét.',
  },
  income: {
    title: 'Thu nhập',
    description: 'Theo dõi doanh thu và hoa hồng cá nhân theo kỳ, trong phạm vi được phân quyền.',
  },
};

type Props = RolePageProps & {section: SalesSection};

/** One task-focused Sales workspace, shared by employee and collaborator accounts. */
export function SalesFocusPage({section, ...props}: Props) {
  const {apiBase, token, abilities, workspace, onChanged, search, setSearch, salesWorkflow} = props;
  const proposalActionRef = useRef<{open: () => void} | null>(null);
  const [subview, setSubview] = useState<'main' | 'invitations' | 'renewals' | 'protection'>(() =>
    salesWorkflow === 'invitations' ? 'invitations' : 'main'
  );
  useEffect(() => {
    setSubview(salesWorkflow === 'invitations' ? 'invitations' : 'main');
  }, [section, salesWorkflow]);

  const can = (permission: string) => abilities.includes('*') || abilities.includes(permission);
  const isInvitations = (section === 'customers' || section === 'activities') && subview === 'invitations';
  const panel: Panel = section === 'schools' ? 'schools'
    : section === 'proposals' || isInvitations ? 'operations' : 'customers';
  const tab = section === 'proposals' ? 'proposals'
    : isInvitations ? 'invitations' : undefined;
  const mode: SalesCustomerMode = section === 'customers' || section === 'activities' ? 'mine' : 'all';
  const table = <ChannelOperations key={section + ':' + panel + ':' + (tab ?? 'main')}
    apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged}
    initialPanel={panel} allowedPanels={[panel]} hideTabs hideOperationsTabs
    compactOperations hideCustomerActivityHistory={section === 'customers' || section === 'activities'}
    embeddedSalesTable={section === 'proposals' || isInvitations}
    proposalActionRef={proposalActionRef} initialOperationsTab={tab}
    customerView={onOpenCustomer => <ChannelSalesView apiBase={apiBase} token={token} mode={mode}
      embedded={section === 'customers' || section === 'activities'} workspace={workspace}
      search={search} setSearch={setSearch} onOpenCustomer={onOpenCustomer}
      onExtensionSubmitted={onChanged}
      canRegister={can('channel_sales.approach.register')}
      canAddActivity={can('channel_sales.activity.create')}
      canReportContract={can('channel_sales.contract.report')}
      canRecordRevenue={can('channel_sales.revenue.record')}
      onRegister={props.onRegister} onAddActivity={props.onAddActivity}
      onReportContract={props.onReportContract} onRecordRevenue={props.onRecordRevenue}/>} />;
  const hasTaskTabs = section === 'customers' || section === 'activities';
  const contained = hasTaskTabs || section === 'proposals';
  const canCreateProposal = section === 'proposals' && !!apiBase && !!token &&
    abilities.includes('channel_sales.school.proposal.submit') &&
    !abilities.includes('channel_sales.scope.all');
  return section === 'income' ? <SalesIncomePage apiBase={apiBase} token={token} abilities={abilities}/> : <div className="space-y-5">
    <AppPageHeader eyebrow="BÁN HÀNG / KIDSFIT CRM" title={copy[section].title}
      description={copy[section].description}
      actions={canCreateProposal ? <AppButton type="button" tone="green"
        className="h-10 rounded-lg px-4"
        leadingIcon={<Plus className="size-4" aria-hidden="true"/>}
        onClick={() => proposalActionRef.current?.open()}>Thêm mới</AppButton> : undefined}/>
    {contained ? <section className="min-w-0 space-y-5">
      {hasTaskTabs && <nav aria-label="Nhóm công việc Sales"
        className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border bg-transparent">
        {[
          {id:'main',label:'Trường đang phụ trách'},
          {id:'invitations',label:'Chờ nhận phân bổ'},
          ...(section==='customers' && can('channel_sales.renewal.submit')
            ? [{id:'renewals',label:'Hợp đồng tái ký'}] : []),
          ...(section==='customers' && can('channel_sales.customer.view')
            ? [{id:'protection',label:'Quản lý quyền bảo vệ'}] : []),
        ].map(item => <button key={item.id} type="button"
          onClick={() => setSubview(item.id as typeof subview)}
          aria-current={subview === item.id ? 'page' : undefined}
          className={`-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${subview === item.id
            ? 'border-[#1b5e20] text-[#1b5e20] dark:border-green-400 dark:text-green-400'
            : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}>
          {item.label}
        </button>)}
      </nav>}
      {section==='customers' && subview==='renewals'
        ? <ContractRenewalSalesPanel apiBase={apiBase} token={token} abilities={abilities}/>
        : section==='customers' && subview==='protection'
          ? <SalesProtectionOverview apiBase={apiBase} token={token}/>
          : table}
    </section> : table}
    {section === 'customers' && !apiBase && <p className="text-xs text-muted-foreground">
      Dữ liệu xem trước không đại diện cho quyền sở hữu trường thực tế.
    </p>}
    {section === 'activities' && <p className="text-xs text-muted-foreground">
      Gia hạn phải có bằng chứng tiến độ và được Quản lý phê duyệt; ghi nhận hoạt động không tự kéo dài quyền tiếp cận.
    </p>}
  </div>;
}
