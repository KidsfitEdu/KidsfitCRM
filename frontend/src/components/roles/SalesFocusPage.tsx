'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { CalendarClock, Handshake, School, UsersRound } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { ChannelOperations } from '@/components/crm/channel-operations';
import { ChannelSalesView, type SalesCustomerMode } from '@/components/crm/channel-sales-view';
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
    description: 'Theo dõi trường đang phụ trách, hợp đồng và lời mời phân bổ từ Quản lý.',
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
  const [subview, setSubview] = useState<'main' | 'invitations' | 'extensions'>(() =>
    section === 'customers' && salesWorkflow === 'invitations' ? 'invitations'
      : section === 'activities' && salesWorkflow === 'extensions' ? 'extensions' : 'main'
  );
  useEffect(() => {
    setSubview(section === 'customers' && salesWorkflow === 'invitations' ? 'invitations'
      : section === 'activities' && salesWorkflow === 'extensions' ? 'extensions' : 'main');
  }, [section, salesWorkflow]);

  const can = (permission: string) => abilities.includes('*') || abilities.includes(permission);
  const isInvitations = section === 'customers' && subview === 'invitations';
  const isExtensions = section === 'activities' && subview === 'extensions';
  const panel: Panel = section === 'schools' ? 'schools'
    : section === 'income' ? 'finance'
    : section === 'proposals' || isInvitations || isExtensions ? 'operations' : 'customers';
  const tab = section === 'proposals' ? 'proposals'
    : isInvitations ? 'invitations' : isExtensions ? 'extensions' : undefined;
  const mode: SalesCustomerMode = section === 'customers' ? 'mine'
    : section === 'activities' ? 'activities' : 'all';
  const owned = workspace.data.filter(c => c.can_manage_approach ||
    (c.visible_status === 'CONTRACTED' && c.contract_id !== null));
  const activeCount = owned.filter(c => c.visible_status === 'APPROACHING').length;
  const contractsCount = owned.filter(c => c.visible_status === 'CONTRACTED').length;
  const expiringCount = owned.filter(c => c.visible_status === 'APPROACHING' && c.protected_until &&
    new Date(c.protected_until).getTime() > Date.now() &&
    new Date(c.protected_until).getTime() <= Date.now() + 48 * 3600000).length;

  return <div className="space-y-5">
    <AppPageHeader eyebrow="BÁN HÀNG / KIDSFIT CRM" title={copy[section].title}
      description={copy[section].description}/>
    {section === 'customers' && <div className="grid gap-3 sm:grid-cols-3">
      <AppStatCard icon={Handshake} label="Đang tiếp cận" value={activeCount}/>
      <AppStatCard icon={School} label="Hồ sơ hợp đồng" value={contractsCount}/>
      <AppStatCard icon={CalendarClock} label="Sắp hết hạn (48 giờ)" value={expiringCount}/>
    </div>}
    {(section === 'customers' || section === 'activities') && <nav aria-label="Nhóm công việc Sales"
      className="flex max-w-full gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2">
      {(section === 'customers'
        ? [{id:'main',label:'Trường đang phụ trách',icon:UsersRound},
          {id:'invitations',label:'Chờ nhận phân bổ',icon:School}]
        : [{id:'main',label:'Hoạt động tư vấn',icon:Handshake},
          {id:'extensions',label:'Gia hạn tiếp cận',icon:CalendarClock}]
      ).map(item => <button key={item.id} type="button" onClick={() => setSubview(item.id as typeof subview)}
        aria-current={subview === item.id ? 'page' : undefined}
        className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${subview === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
        <item.icon className="size-4" aria-hidden="true"/>{item.label}
      </button>)}
    </nav>}
    {section === 'income' && (!apiBase || !can('channel_sales.commission.view')) ? (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {apiBase ? 'Tài khoản chưa được cấp quyền xem thu nhập cá nhân.' : 'Chế độ xem thử chưa kết nối dữ liệu doanh thu và hoa hồng cá nhân.'}
      </div>
    ) : <ChannelOperations key={section + ':' + panel + ':' + (tab ?? 'main')}
      apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged}
      initialPanel={panel} allowedPanels={[panel]} hideTabs hideOperationsTabs
      compactOperations initialOperationsTab={tab}
      customerView={onOpenCustomer => <ChannelSalesView mode={mode} workspace={workspace}
        search={search} setSearch={setSearch} onOpenCustomer={onOpenCustomer}
        canRegister={can('channel_sales.approach.register')}
        canAddActivity={can('channel_sales.activity.create')}
        canReportContract={can('channel_sales.contract.report')}
        canRecordRevenue={can('channel_sales.revenue.record')}
        onRegister={props.onRegister} onAddActivity={props.onAddActivity}
        onReportContract={props.onReportContract} onRecordRevenue={props.onRecordRevenue}/>} />}
    {!apiBase && section === 'income' && <p className="text-sm text-muted-foreground">
      Bản xem trước chỉ đọc; dữ liệu thu nhập thực tế cần kết nối API và quyền xem hoa hồng.
    </p>}
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
