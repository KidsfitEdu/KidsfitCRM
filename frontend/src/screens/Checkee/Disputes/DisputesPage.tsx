'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Checkee · Disputes (shared domain view). */
export function DisputesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Checkee" section="disputes" {...props}/>;
}
