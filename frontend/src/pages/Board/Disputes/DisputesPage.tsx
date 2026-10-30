'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Disputes (shared domain view). */
export function DisputesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Board" section="disputes" {...props}/>;
}
