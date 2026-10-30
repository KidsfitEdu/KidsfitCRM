'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** SalesStaff · Activities (shared domain view). */
export function ActivitiesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="SalesStaff" section="activities" {...props}/>;
}
