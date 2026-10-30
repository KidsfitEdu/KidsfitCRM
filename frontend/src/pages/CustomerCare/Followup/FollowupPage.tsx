'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Followup (shared domain view). */
export function FollowupPage(props: RolePageProps) {
  return <RoleOperationsPage profile="CustomerCare" section="followup" {...props}/>;
}
