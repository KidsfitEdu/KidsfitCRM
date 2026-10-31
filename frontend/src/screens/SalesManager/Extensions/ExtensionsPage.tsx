'use client';
import { ManagerWorklists } from '@/components/roles/ManagerWorklists';
import type { ManagerPageProps } from '@/types/manager-pages';
export function ExtensionsPage(props: ManagerPageProps) {
  return <ManagerWorklists section="extensions" {...props} />;
}
