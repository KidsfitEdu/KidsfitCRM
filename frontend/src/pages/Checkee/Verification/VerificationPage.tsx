'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Checkee · Xác minh hợp đồng (view uses shared CRM business components). */
export function VerificationPage(props: RolePageProps) {
  return <RoleOperationsPage role="Checkee" section="verification" {...props}/>;
}
