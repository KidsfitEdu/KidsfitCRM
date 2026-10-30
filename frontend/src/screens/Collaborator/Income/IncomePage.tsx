'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Collaborator · Income (shared domain view). */
export function IncomePage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="income" {...props}/>;
}
