'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Collaborator · Schools (shared domain view). */
export function SchoolsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="schools" {...props}/>;
}
