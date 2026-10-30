'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RolePageProps } from '@/src/types/role-pages';
import { rolePageSections } from '@/src/config/role-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { OversightPage } from './Oversight/OversightPage';
import { OverduePage } from './Overdue/OverduePage';
import { DisputesPage } from './Disputes/DisputesPage';
import { PoliciesPage } from './Policies/PoliciesPage';

export type RoleSection = keyof typeof rolePageSections.Board;
type Props = RolePageProps & {section: RoleSection};
const pages = {
  dashboard: DashboardPage,
  oversight: OversightPage,
  overdue: OverduePage,
  disputes: DisputesPage,
  policies: PoliciesPage,
};

/** Existing view IDs are preserved; each page owns its UI entrypoint. */
export function BoardWorkspace({section, ...props}: Props) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } }));
  const Page = pages[section];
  return <QueryClientProvider client={queryClient}>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </QueryClientProvider>;
}
