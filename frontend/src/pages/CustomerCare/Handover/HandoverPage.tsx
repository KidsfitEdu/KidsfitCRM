'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Trường bàn giao (view uses shared CRM business components). */
export function HandoverPage(props: RolePageProps) {
  return <RoleOperationsPage role="CustomerCare" section="handover" {...props}/>;
}
