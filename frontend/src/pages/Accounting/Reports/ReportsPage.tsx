'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Accounting · Báo cáo (view uses shared CRM business components). */
export function ReportsPage(props: RolePageProps) {
  return <RoleOperationsPage role="Accounting" section="reports" {...props}/>;
}
