'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Accounting · Revenue (shared domain view). */
export function RevenuePage(props: RolePageProps) {
  return <RoleOperationsPage profile="Accounting" section="revenue" {...props}/>;
}
