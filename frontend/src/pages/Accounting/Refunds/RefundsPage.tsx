'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Accounting · Hủy & hoàn (view uses shared CRM business components). */
export function RefundsPage(props: RolePageProps) {
  return <RoleOperationsPage role="Accounting" section="refunds" {...props}/>;
}
