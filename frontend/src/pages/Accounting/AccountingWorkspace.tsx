'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RolePageProps } from '@/src/types/role-pages';
import { rolePageSections } from '@/src/config/role-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { RevenuePage } from './Revenue/RevenuePage';
import { PaymentsPage } from './Payments/PaymentsPage';
import { RefundsPage } from './Refunds/RefundsPage';
import { ReportsPage } from './Reports/ReportsPage';

export type RoleSection = keyof typeof rolePageSections.Accounting;
type Props = RolePageProps & {section: RoleSection};
const pages = {
  dashboard: DashboardPage,
  revenue: RevenuePage,
  payments: PaymentsPage,
  refunds: RefundsPage,
  reports: ReportsPage,
};

/** Existing view IDs are preserved; each page owns its UI entrypoint. */
export function AccountingWorkspace({section, ...props}: Props) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } }));
  const Page = pages[section];
  return <QueryClientProvider client={queryClient}>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </QueryClientProvider>;
}
