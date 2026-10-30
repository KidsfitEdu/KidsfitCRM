'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Accounting · Payments (shared domain view). */
export function PaymentsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Accounting" section="payments" {...props}/>;
}
