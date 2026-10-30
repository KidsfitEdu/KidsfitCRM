'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Gia hạn (view uses shared CRM business components). */
export function ExtensionsPage(props: RolePageProps) {
  return <RoleOperationsPage role="Collaborator" section="extensions" {...props}/>;
}
