'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Income (shared domain view). */
export function IncomePage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="income" {...props}/>;
}
