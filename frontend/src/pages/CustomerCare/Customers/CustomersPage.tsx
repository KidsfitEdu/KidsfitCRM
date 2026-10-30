'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Customers (shared domain view). */
export function CustomersPage(props: RolePageProps) {
  return <RoleOperationsPage profile="CustomerCare" section="customers" {...props}/>;
}
