'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** SalesStaff · Proposals (shared domain view). */
export function ProposalsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="SalesStaff" section="proposals" {...props}/>;
}
