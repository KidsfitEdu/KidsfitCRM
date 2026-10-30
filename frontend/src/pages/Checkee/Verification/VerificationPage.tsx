'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Checkee · Verification (shared domain view). */
export function VerificationPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Checkee" section="verification" {...props}/>;
}
