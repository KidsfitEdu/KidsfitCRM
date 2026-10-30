'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Board · Overdue (shared domain view). */
export function OverduePage(props: RolePageProps) {
  return <RoleOperationsPage profile="Board" section="overdue" {...props}/>;
}
