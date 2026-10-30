'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** SalesStaff · Thu nhập (view uses shared CRM business components). */
export function IncomePage(props: RolePageProps) {
  return <RoleOperationsPage role="SalesStaff" section="income" {...props}/>;
}
