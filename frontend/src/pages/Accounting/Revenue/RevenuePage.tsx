'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Accounting · Revenue (shared domain view). */
export function RevenuePage(props: RolePageProps) {
  return <RoleOperationsPage profile="Accounting" section="revenue" {...props}/>;
}
