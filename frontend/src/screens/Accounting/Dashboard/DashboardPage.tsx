'use client';

import { RoleDashboard } from '@/components/roles/RoleDashboard';
import type { RolePageProps } from '@/types/role-pages';

/** Accounting · Dashboard (shared domain view). */
export function DashboardPage(props: RolePageProps) {
  return <RoleDashboard profile="Accounting" {...props}/>;
}
