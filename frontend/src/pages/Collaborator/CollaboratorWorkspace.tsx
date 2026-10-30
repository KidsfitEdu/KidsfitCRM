'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RolePageProps } from '@/src/types/role-pages';
import { rolePageSections } from '@/src/config/role-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { SchoolsPage } from './Schools/SchoolsPage';
import { ProposalsPage } from './Proposals/ProposalsPage';
import { InvitationsPage } from './Invitations/InvitationsPage';
import { ApproachesPage } from './Approaches/ApproachesPage';
import { ExtensionsPage } from './Extensions/ExtensionsPage';
import { IncomePage } from './Income/IncomePage';

export type RoleSection = keyof typeof rolePageSections.Collaborator;
type Props = RolePageProps & {section: RoleSection};
const pages = {
  dashboard: DashboardPage,
  schools: SchoolsPage,
  proposals: ProposalsPage,
  invitations: InvitationsPage,
  approaches: ApproachesPage,
  extensions: ExtensionsPage,
  income: IncomePage,
};

/** Existing view IDs are preserved; each page owns its UI entrypoint. */
export function CollaboratorWorkspace({section, ...props}: Props) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } }));
  const Page = pages[section];
  return <QueryClientProvider client={queryClient}>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </QueryClientProvider>;
}
