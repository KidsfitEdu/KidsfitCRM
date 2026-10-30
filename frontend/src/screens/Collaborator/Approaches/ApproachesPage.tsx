'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Collaborator · Approaches (shared domain view). */
export function ApproachesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="approaches" {...props}/>;
}
