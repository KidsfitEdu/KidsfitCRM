'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Khách hàng (view uses shared CRM business components). */
export function CustomersPage(props: RolePageProps) {
  return <RoleOperationsPage role="CustomerCare" section="customers" {...props}/>;
}
