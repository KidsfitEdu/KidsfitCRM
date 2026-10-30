'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** CustomerCare · Customers (shared domain view). */
export function CustomersPage(props: RolePageProps) {
  return <RoleOperationsPage profile="CustomerCare" section="customers" {...props}/>;
}
