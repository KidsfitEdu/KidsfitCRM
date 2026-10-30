'use client';

import type { RolePageProps } from '@/types/role-pages';
import { rolePageSections } from '@/config/role-pages';
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
  const Page = pages[section];
  return <>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </>;
}
