'use client';

import type { ComponentProps } from 'react';
import { ChannelOperations } from '@/components/crm/channel-operations';
import { AppPageHeader } from '@/components/common/app-page-header';
import { ChannelSalesView } from '@/components/crm/channel-sales-view';
import { SalesFocusPage } from './SalesFocusPage';
import { rolePageSections, type RolePageGroup } from '@/config/role-pages';
import type { RolePageProps } from '@/types/role-pages';

type Panel = ComponentProps<typeof ChannelOperations>['allowedPanels'];
type SectionDefinition = {label: string; panel: string; tab: string};

/** Presents an existing ChannelOperations view without copying business rules into each role. */
export function RoleOperationsPage({ profile, section, ...props }: RolePageProps & { profile: RolePageGroup; section: string }) {
  if (profile === 'SalesStaff') return <SalesFocusPage section={section as 'schools'|'customers'|'activities'|'proposals'|'income'} {...props}/>;
  const sections: Record<string, SectionDefinition> = rolePageSections[profile];
  const active = sections[section];
  if (!active || active.panel === 'dashboard') return <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>;
  const { apiBase, token, abilities, workspace, search, setSearch, onChanged } = props;
  const can = (permission: string) => abilities.includes(permission) || abilities.includes('*');
  const allowedPanels = [...new Set(Object.values(sections).filter(s => s.panel !== 'dashboard').map(s => s.panel))] as Panel;
  return <div className="space-y-5">
    <AppPageHeader eyebrow={`${profile.toUpperCase()} / KIDSFIT CRM`} title={active.label}
      description={sectionDescription[profile]?.[section] ?? 'Danh sách và công việc theo quyền truy cập của tài khoản.'}/>
    <ChannelOperations key={section} apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged}
      initialPanel={active.panel as Exclude<ComponentProps<typeof ChannelOperations>['initialPanel'], undefined>}
      initialOperationsTab={active.tab || undefined}
      reconciliationView={profile === 'Checkee' && ['verification','reconciliation','disputes','history'].includes(section) ? section as 'verification'|'reconciliation'|'disputes'|'history' : undefined}
      allowedPanels={allowedPanels} hideTabs hideOperationsTabs={active.panel === 'operations'}
      customerView={onOpenCustomer => <ChannelSalesView
        onOpenCustomer={onOpenCustomer} workspace={workspace} search={search} setSearch={setSearch}
        canRegister={can('channel_sales.approach.register')} canAddActivity={can('channel_sales.activity.create')}
        canReportContract={can('channel_sales.contract.report')} canRecordRevenue={can('channel_sales.revenue.record')}
        onRegister={props.onRegister} onAddActivity={props.onAddActivity}
        onReportContract={props.onReportContract} onRecordRevenue={props.onRecordRevenue}/>} />
  </div>;
}

/** User-facing purpose for each role menu, without changing the backend data scope. */
const sectionDescription: Partial<Record<RolePageGroup, Record<string, string>>> = {
  Board: {
    oversight: 'Giám sát các chỉ số và tình trạng xử lý của hệ thống.',
    overdue: 'Theo dõi hồ sơ cần xử lý và các hạn đã ghi nhận.',
    disputes: 'Xem tranh chấp và thông tin phục vụ giám sát.',
    policies: 'Theo dõi chính sách và quyết định liên quan.',
  },
  Accounting: {
    revenue: 'Đối chiếu doanh thu theo kỳ và nguồn phát sinh.',
    payments: 'Theo dõi phiếu chi, trạng thái thanh toán và đối soát.',
    refunds: 'Kiểm tra các trường hợp hủy hoặc hoàn cần xử lý.',
    reports: 'Tổng hợp số liệu tài chính theo phạm vi được phân quyền.',
  },
  CustomerCare: {
    handover: 'Theo dõi hồ sơ được bàn giao từ bộ phận bán hàng.',
    cases: 'Xử lý các yêu cầu hỗ trợ và cập nhật tiến độ.',
    customers: 'Tra cứu thông tin khách hàng trong phạm vi được phép.',
    followup: 'Theo dõi các công việc chăm sóc cần thực hiện.',
  },
  Checkee: {
    verification: 'Xem hồ sơ hợp đồng cần xác minh.',
    reconciliation: 'Đối soát hợp đồng và quyền bảo vệ khách hàng.',
    disputes: 'Theo dõi các hồ sơ có tranh chấp.',
    history: 'Tra cứu lịch sử đối soát và xác minh.',
  },
  Collaborator: {
    schools: 'Tra cứu và đăng ký trường đủ điều kiện tiếp cận.',
    proposals: 'Theo dõi đề xuất trường mới đang chờ xử lý.',
    invitations: 'Nhận hoặc từ chối lời mời phân bổ.',
    approaches: 'Ghi nhận tiến độ và theo dõi trường đang tiếp cận.',
    extensions: 'Theo dõi yêu cầu gia hạn theo quy định.',
    income: 'Tra cứu hoa hồng trong phạm vi tài khoản.',
  },
};
