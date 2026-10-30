'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Hồ sơ quá hạn (view uses shared CRM business components). */
export function OverduePage(props: RolePageProps) {
  return <RoleOperationsPage role="Board" section="overdue" {...props}/>;
}
