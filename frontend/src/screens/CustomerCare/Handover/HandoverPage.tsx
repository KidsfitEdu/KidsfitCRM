'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** CustomerCare · Handover (shared domain view). */
export function HandoverPage(props: RolePageProps) {
  return <RoleOperationsPage profile="CustomerCare" section="handover" {...props}/>;
}
