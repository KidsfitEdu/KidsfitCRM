'use client';

import { AdminWorkspace } from '@/components/crm/admin/admin-workspace';
import type { ComponentProps } from 'react';

/** Admin page entrypoint. The legacy workspace retains data/dialog state until
 * the corresponding page is migrated with behavior and permission parity tests. */
export function SchoolsPage(props: Omit<ComponentProps<typeof AdminWorkspace>, 'section'>) {
  return <AdminWorkspace {...props} section='admin-schools' />;
}
