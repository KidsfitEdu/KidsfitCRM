'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Board · Oversight (shared domain view). */
export function OversightPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Board" section="oversight" {...props}/>;
}
