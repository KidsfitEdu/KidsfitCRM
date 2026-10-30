'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** SalesStaff · Tiếp cận & tư vấn (view uses shared CRM business components). */
export function ActivitiesPage(props: RolePageProps) {
  return <RoleOperationsPage role="SalesStaff" section="activities" {...props}/>;
}
