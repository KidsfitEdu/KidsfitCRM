'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Hoa hồng (view uses shared CRM business components). */
export function IncomePage(props: RolePageProps) {
  return <RoleOperationsPage role="Collaborator" section="income" {...props}/>;
}
