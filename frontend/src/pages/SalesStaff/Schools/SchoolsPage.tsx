'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** SalesStaff · Danh sách trường (view uses shared CRM business components). */
export function SchoolsPage(props: RolePageProps) {
  return <RoleOperationsPage role="SalesStaff" section="schools" {...props}/>;
}
