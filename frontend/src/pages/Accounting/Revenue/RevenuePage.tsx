'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Accounting · Doanh thu (view uses shared CRM business components). */
export function RevenuePage(props: RolePageProps) {
  return <RoleOperationsPage role="Accounting" section="revenue" {...props}/>;
}
