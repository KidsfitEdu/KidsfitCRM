import type { ComponentProps } from 'react';
import type { ChannelSalesView } from '@/components/crm/channel-sales-view';
import type { ChannelSalesWorkspace } from '@/lib/channel-sales';

/** Role UI input props from the existing CrmApp, without the workspace's section switch. */
export type RolePageProps = {
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
