'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Plus, School, UsersRound } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { ChannelOperations } from '@/components/crm/channel-operations';
import { ChannelSalesView, type SalesCustomerMode } from '@/components/crm/channel-sales-view';
import { SalesContractRevisions } from '@/components/roles/SalesContractRevisions';
import { SalesIncomePage } from './SalesIncomePage';
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
    description: 'Hồ sơ trường, cập nhật tư vấn và lịch sử tiếp cận.',
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
  const [subview, setSubview] = useState<'main' | 'invitations'>(() =>
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
    {section === 'customers' && <SalesContractRevisions apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged}/>}
    {contained ? <section className={section === 'customers'
      ? 'min-w-0 bg-white dark:bg-card'
      : 'min-w-0 bg-white dark:bg-card'}>
      {hasTaskTabs && <nav aria-label="Nhóm công việc Sales"
        className="flex w-full items-end border-b border-border/70 bg-white px-4 dark:bg-card sm:px-5">
        <div className="flex w-full items-end gap-3 sm:gap-5 lg:w-[30%]">
          {[
            {id:'main',label:'Trường đang phụ trách',icon:UsersRound},
            {id:'invitations',label:'Chờ nhận phân bổ',icon:School},
          ].map(item => <button key={item.id} type="button" title={item.label}
            onClick={() => setSubview(item.id as typeof subview)}
            aria-current={subview === item.id ? 'page' : undefined}
            className={`flex min-h-12 min-w-0 flex-1 items-center justify-center gap-1.5 border-b-[3px] bg-transparent px-1 pt-2 text-center text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:text-sm lg:text-[12px] xl:text-[13px] ${subview === item.id
              ? 'border-[#1b5e20] font-semibold text-[#1b5e20] dark:border-[#a5d6a7] dark:text-[#a5d6a7]'
              : 'border-transparent font-medium text-muted-foreground hover:border-[#1b5e20]/35 hover:text-[#1b5e20] dark:hover:text-[#a5d6a7]'}`}>
            <item.icon className="size-3.5 shrink-0" aria-hidden="true"/>
            <span className="min-w-0 leading-snug">{item.label}</span>
          </button>)}
        </div>
      </nav>}
      {table}
    </section> : table}
    {section === 'customers' && !apiBase && <p className="text-xs text-muted-foreground">
      Dữ liệu xem trước không đại diện cho quyền sở hữu trường thực tế.
    </p>}
    {section === 'proposals' && <p className="text-xs text-muted-foreground">
      Đề xuất mới chỉ được thêm vào danh bạ sau khi Quản lý chuyển tiếp và Admin phê duyệt.
    </p>}
    {section === 'activities' && <p className="text-xs text-muted-foreground">
      Gia hạn phải có bằng chứng tiến độ và được Quản lý phê duyệt; ghi nhận hoạt động không tự kéo dài quyền tiếp cận.
    </p>}
  </div>;
}
