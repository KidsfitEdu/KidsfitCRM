'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** SalesStaff · Đề xuất trường (view uses shared CRM business components). */
export function ProposalsPage(props: RolePageProps) {
  return <RoleOperationsPage role="SalesStaff" section="proposals" {...props}/>;
}
