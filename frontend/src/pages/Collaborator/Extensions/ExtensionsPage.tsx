'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Extensions (shared domain view). */
export function ExtensionsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="extensions" {...props}/>;
}
