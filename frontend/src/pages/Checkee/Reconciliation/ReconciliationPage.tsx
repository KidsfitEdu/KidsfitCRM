'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Checkee · Reconciliation (shared domain view). */
export function ReconciliationPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Checkee" section="reconciliation" {...props}/>;
}
