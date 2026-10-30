'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Checkee · Disputes (shared domain view). */
export function DisputesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Checkee" section="disputes" {...props}/>;
}
