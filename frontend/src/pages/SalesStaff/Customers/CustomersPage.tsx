'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** SalesStaff · Customers (shared domain view). */
export function CustomersPage(props: RolePageProps) {
  return <RoleOperationsPage profile="SalesStaff" section="customers" {...props}/>;
}
