'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Accounting · Refunds (shared domain view). */
export function RefundsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Accounting" section="refunds" {...props}/>;
}
