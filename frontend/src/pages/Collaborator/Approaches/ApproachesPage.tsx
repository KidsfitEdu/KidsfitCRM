'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Approaches (shared domain view). */
export function ApproachesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="approaches" {...props}/>;
}
