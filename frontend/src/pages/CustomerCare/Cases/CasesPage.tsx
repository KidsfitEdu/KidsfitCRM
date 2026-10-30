'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Cases (shared domain view). */
export function CasesPage(props: RolePageProps) {
  return <RoleOperationsPage profile="CustomerCare" section="cases" {...props}/>;
}
