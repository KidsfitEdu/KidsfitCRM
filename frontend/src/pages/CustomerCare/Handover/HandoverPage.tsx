'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** CustomerCare · Handover (shared domain view). */
export function HandoverPage(props: RolePageProps) {
  return <RoleOperationsPage profile="CustomerCare" section="handover" {...props}/>;
}
