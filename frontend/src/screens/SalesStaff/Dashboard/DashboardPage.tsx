'use client';

import { SalesDashboard } from '@/components/roles/SalesDashboard';
import type { RolePageProps } from '@/types/role-pages';

/** SalesStaff · Dashboard (shared domain view). */
export function DashboardPage(props: RolePageProps) {
  return <SalesDashboard {...props}/>;
}
