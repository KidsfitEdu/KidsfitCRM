'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Checkee · History (shared domain view). */
export function HistoryPage(props: RolePageProps) {
  return <RoleOperationsPage profile="Checkee" section="history" {...props}/>;
}
