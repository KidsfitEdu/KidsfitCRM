'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Yêu cầu hỗ trợ (view uses shared CRM business components). */
export function CasesPage(props: RolePageProps) {
  return <RoleOperationsPage role="CustomerCare" section="cases" {...props}/>;
}
