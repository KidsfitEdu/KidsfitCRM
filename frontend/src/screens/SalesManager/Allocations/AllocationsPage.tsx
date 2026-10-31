'use client';
import { ManagerWorklists } from '@/components/roles/ManagerWorklists';
import type { ManagerPageProps } from '@/types/manager-pages';
export function AllocationsPage(props: ManagerPageProps) {
  return <ManagerWorklists section="allocations" {...props} />;
}
