'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Accounting · Reports (shared domain view). */
export function ReportsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Accounting" section="reports" {...props}/>;
}
