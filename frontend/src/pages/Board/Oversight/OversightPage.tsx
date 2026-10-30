'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Board · Giám sát & báo cáo (view uses shared CRM business components). */
export function OversightPage(props: RolePageProps) {
  return <RoleOperationsPage role="Board" section="oversight" {...props}/>;
}
