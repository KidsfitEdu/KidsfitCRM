'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Đăng ký trường (view uses shared CRM business components). */
export function SchoolsPage(props: RolePageProps) {
  return <RoleOperationsPage role="Collaborator" section="schools" {...props}/>;
}
