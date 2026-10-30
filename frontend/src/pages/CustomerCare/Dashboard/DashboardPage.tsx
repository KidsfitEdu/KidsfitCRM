'use client';

import { RoleDashboard } from '@/src/components/roles/RoleDashboard';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Tổng quan (view uses shared CRM business components). */
export function DashboardPage(props: RolePageProps) {
  return <RoleDashboard role="CustomerCare" {...props}/>;
}
