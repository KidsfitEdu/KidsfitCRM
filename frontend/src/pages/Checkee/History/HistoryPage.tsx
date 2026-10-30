'use client';

import { RoleOperationsPage } from '@/src/components/roles/RoleOperationsPage';
import type { RolePageProps } from '@/src/types/role-pages';

/** Checkee · Lịch sử (view uses shared CRM business components). */
export function HistoryPage(props: RolePageProps) {
  return <RoleOperationsPage role="Checkee" section="history" {...props}/>;
}
