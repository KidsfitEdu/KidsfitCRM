'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Overdue (shared domain view). */
export function OverduePage(props: RolePageProps) {
  return <RoleOperationsPage profile="Board" section="overdue" {...props}/>;
}
