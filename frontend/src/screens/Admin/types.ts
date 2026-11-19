import type { ChannelSalesWorkspace } from '@/lib/channel-sales';

export type AdminPageProps = {
  apiBase: string;
  token: string;
  abilities: string[];
  workspace: ChannelSalesWorkspace;
  onChanged: () => Promise<void>;
  onSalesNavigate?: (view: import('@/config/navigation').View) => void;
};
