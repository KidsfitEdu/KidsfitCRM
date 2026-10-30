'use client';

import { RoleDashboard } from '@/src/components/roles/RoleDashboard';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Dashboard (shared domain view). */
export function DashboardPage(props: RolePageProps) {
  return <RoleDashboard profile="Board" {...props}/>;
}
