'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Policies (shared domain view). */
export function PoliciesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Board" section="policies" {...props}/>;
}
