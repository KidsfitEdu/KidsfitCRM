'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Chính sách (view uses shared CRM business components). */
export function PoliciesPage(props: RolePageProps) {
  return <RoleOperationsPage role="Board" section="policies" {...props}/>;
}
