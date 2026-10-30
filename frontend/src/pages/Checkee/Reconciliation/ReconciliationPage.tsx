'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Checkee · Đối soát (view uses shared CRM business components). */
export function ReconciliationPage(props: RolePageProps) {
  return <RoleOperationsPage role="Checkee" section="reconciliation" {...props}/>;
}
