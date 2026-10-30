'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Theo dõi chăm sóc (view uses shared CRM business components). */
export function FollowupPage(props: RolePageProps) {
  return <RoleOperationsPage role="CustomerCare" section="followup" {...props}/>;
}
