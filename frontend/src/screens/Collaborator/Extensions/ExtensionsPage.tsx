'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Collaborator · Extensions (shared domain view). */
export function ExtensionsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="extensions" {...props}/>;
}
