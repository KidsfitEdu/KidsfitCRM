'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Tranh chấp (view uses shared CRM business components). */
export function DisputesPage(props: RolePageProps) {
  return <RoleOperationsPage role="Board" section="disputes" {...props}/>;
}
