'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RolePageProps } from '@/src/types/role-pages';
import { rolePageSections } from '@/src/config/role-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { VerificationPage } from './Verification/VerificationPage';
import { ReconciliationPage } from './Reconciliation/ReconciliationPage';
import { DisputesPage } from './Disputes/DisputesPage';
import { HistoryPage } from './History/HistoryPage';

export type RoleSection = keyof typeof rolePageSections.Checkee;
type Props = RolePageProps & {section: RoleSection};
const pages = {
  dashboard: DashboardPage,
  verification: VerificationPage,
  reconciliation: ReconciliationPage,
  disputes: DisputesPage,
  history: HistoryPage,
};

/** Existing view IDs are preserved; each page owns its UI entrypoint. */
export function CheckeeWorkspace({section, ...props}: Props) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } }));
  const Page = pages[section];
  return <QueryClientProvider client={queryClient}>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </QueryClientProvider>;
}
