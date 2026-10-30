'use client';

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
  const Page = pages[section];
  return <>
    {Page ? <Page {...props}/> : <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}
  </>;
}
