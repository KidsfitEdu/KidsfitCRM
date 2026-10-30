'use client';

import { RoleDashboard } from '@/src/components/roles/RoleDashboard';
import type { RolePageProps } from '@/src/types/role-pages';

/** Accounting · Dashboard (shared domain view). */
export function DashboardPage(props: RolePageProps) {
  return <RoleDashboard profile="Accounting" {...props}/>;
}
