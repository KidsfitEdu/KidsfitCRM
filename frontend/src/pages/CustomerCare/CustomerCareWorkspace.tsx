'use client';

import type { RolePageProps } from '@/types/role-pages';
import { rolePageSections } from '@/config/role-pages';
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
  const Page = pages[section];
  return <>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </>;
}
