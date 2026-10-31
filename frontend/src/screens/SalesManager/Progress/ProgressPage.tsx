'use client';
import { ManagerWorklists } from '@/components/roles/ManagerWorklists';
import type { ManagerPageProps } from '@/types/manager-pages';
export function ProgressPage(props: ManagerPageProps) {
  return <ManagerWorklists section="progress" {...props} />;
}
