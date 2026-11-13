'use client';

import type { RolePageProps } from '@/types/role-pages';
import { rolePageSections } from '@/config/role-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { RevenuePage } from './Revenue/RevenuePage';

export type RoleSection = keyof typeof rolePageSections.Accounting;
type Props = RolePageProps & {section: RoleSection};
const pages = {
  dashboard: DashboardPage,
  revenue: RevenuePage,
};

/** Existing view IDs are preserved; each page owns its UI entrypoint. */
export function AccountingWorkspace({section, ...props}: Props) {
  const Page = pages[section];
  return <>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </>;
}
