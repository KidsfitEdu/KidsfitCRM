'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Nhận phân bổ (view uses shared CRM business components). */
export function InvitationsPage(props: RolePageProps) {
  return <RoleOperationsPage role="Collaborator" section="invitations" {...props}/>;
}
