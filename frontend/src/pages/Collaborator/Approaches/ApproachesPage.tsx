'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Tiếp cận & tư vấn (view uses shared CRM business components). */
export function ApproachesPage(props: RolePageProps) {
  return <RoleOperationsPage role="Collaborator" section="approaches" {...props}/>;
}
