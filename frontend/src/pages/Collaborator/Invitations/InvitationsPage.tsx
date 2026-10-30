'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Collaborator · Invitations (shared domain view). */
export function InvitationsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="invitations" {...props}/>;
}
