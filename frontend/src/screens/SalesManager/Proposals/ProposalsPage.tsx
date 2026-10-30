'use client';
import { ManagerWorklists } from '@/components/roles/ManagerWorklists';
import type { ManagerPageProps } from '@/types/manager-pages';
export function ProposalsPage(props: ManagerPageProps) {
  return <ManagerWorklists section="proposals" {...props} />;
}
