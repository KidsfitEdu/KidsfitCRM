'use client';

import { RoleOperationsPage } from '@/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/types/role-pages';

/** Checkee · Verification (shared domain view). */
export function VerificationPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Checkee" section="verification" {...props}/>;
}
