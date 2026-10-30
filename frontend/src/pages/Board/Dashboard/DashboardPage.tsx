'use client';

import { RoleDashboard } from '@/components/roles/RoleDashboard';
import type { RolePageProps } from '@/types/role-pages';

/** Board · Dashboard (shared domain view). */
export function DashboardPage(props: RolePageProps) {
  return <RoleDashboard profile="Board" {...props}/>;
}
