'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Board · Policies (shared domain view). */
export function PoliciesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Board" section="policies" {...props}/>;
}
