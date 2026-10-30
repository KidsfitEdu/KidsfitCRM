'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Checkee · Tranh chấp (view uses shared CRM business components). */
export function DisputesPage(props: RolePageProps) {
  return <RoleOperationsPage role="Checkee" section="disputes" {...props}/>;
}
