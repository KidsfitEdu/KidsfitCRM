'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Collaborator · Invitations (shared domain view). */
export function InvitationsPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Collaborator" section="invitations" {...props}/>;
}
