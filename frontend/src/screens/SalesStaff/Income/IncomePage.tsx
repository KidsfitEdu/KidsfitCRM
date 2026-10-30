'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** SalesStaff · Income (shared domain view). */
export function IncomePage(props: RolePageProps) {
  return <RoleOperationsPage profile="SalesStaff" section="income" {...props}/>;
}
