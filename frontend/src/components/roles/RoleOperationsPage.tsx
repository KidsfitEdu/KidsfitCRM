'use client';

import type { ComponentProps } from 'react';
import { ChannelOperations } from '@/components/crm/channel-operations';
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
    <ChannelOperations key={section} apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged}
      initialPanel={active.panel as Exclude<ComponentProps<typeof ChannelOperations>['initialPanel'], undefined>}
      initialOperationsTab={active.tab || undefined}
      allowedPanels={allowedPanels} hideTabs hideOperationsTabs={active.panel === 'operations'}
      customerView={onOpenCustomer => <ChannelSalesView
        onOpenCustomer={onOpenCustomer} workspace={workspace} search={search} setSearch={setSearch}
        canRegister={can('channel_sales.approach.register')} canAddActivity={can('channel_sales.activity.create')}
        canReportContract={can('channel_sales.contract.report')} canRecordRevenue={can('channel_sales.revenue.record')}
        onRegister={props.onRegister} onAddActivity={props.onAddActivity}
        onReportContract={props.onReportContract} onRecordRevenue={props.onRecordRevenue}/>} />
  </div>;
}
