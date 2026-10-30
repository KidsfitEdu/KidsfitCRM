'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Accounting · Đối soát & phiếu chi (view uses shared CRM business components). */
export function PaymentsPage(props: RolePageProps) {
  return <RoleOperationsPage role="Accounting" section="payments" {...props}/>;
}
