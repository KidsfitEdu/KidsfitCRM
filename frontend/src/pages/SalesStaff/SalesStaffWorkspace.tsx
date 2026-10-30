'use client';

import type { RolePageProps } from '@/src/types/role-pages';
import { rolePageSections } from '@/src/config/role-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { SchoolsPage } from './Schools/SchoolsPage';
import { CustomersPage } from './Customers/CustomersPage';
import { ActivitiesPage } from './Activities/ActivitiesPage';
import { ProposalsPage } from './Proposals/ProposalsPage';
import { IncomePage } from './Income/IncomePage';

export type RoleSection = keyof typeof rolePageSections.SalesStaff;
type Props = RolePageProps & {section: RoleSection};
const pages = {
  dashboard: DashboardPage,
  schools: SchoolsPage,
  customers: CustomersPage,
  activities: ActivitiesPage,
  proposals: ProposalsPage,
  income: IncomePage,
};

/** Existing view IDs are preserved; each page owns its UI entrypoint. */
export function SalesStaffWorkspace({section, ...props}: Props) {
  const Page = pages[section];
  return <>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </>;
}
