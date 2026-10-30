'use client';

import { RoleDashboard } from '@/src/components/roles/RoleDashboard';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Tổng quan (view uses shared CRM business components). */
export function DashboardPage(props: RolePageProps) {
  return <RoleDashboard role="Board" {...props}/>;
}
