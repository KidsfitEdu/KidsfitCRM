'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RolePageProps } from '@/src/types/role-pages';
import { rolePageSections } from '@/src/config/role-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { HandoverPage } from './Handover/HandoverPage';
import { CasesPage } from './Cases/CasesPage';
import { CustomersPage } from './Customers/CustomersPage';
import { FollowupPage } from './Followup/FollowupPage';

export type RoleSection = keyof typeof rolePageSections.CustomerCare;
type Props = RolePageProps & {section: RoleSection};
const pages = {
  dashboard: DashboardPage,
  handover: HandoverPage,
  cases: CasesPage,
  customers: CustomersPage,
  followup: FollowupPage,
};

/** Existing view IDs are preserved; each page owns its UI entrypoint. */
export function CustomerCareWorkspace({section, ...props}: Props) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } }));
  const Page = pages[section];
  return <QueryClientProvider client={queryClient}>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </QueryClientProvider>;
}
