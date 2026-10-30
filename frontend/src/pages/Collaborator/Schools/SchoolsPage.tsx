'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Schools (shared domain view). */
export function SchoolsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="schools" {...props}/>;
}
