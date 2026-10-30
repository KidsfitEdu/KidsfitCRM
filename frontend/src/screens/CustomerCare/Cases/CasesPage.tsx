'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** CustomerCare · Cases (shared domain view). */
export function CasesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="CustomerCare" section="cases" {...props}/>;
}
