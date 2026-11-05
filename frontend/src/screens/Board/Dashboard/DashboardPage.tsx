'use client';

import { BoardDashboardPage } from '../BoardDashboardPage';
import { ContractLifecycleExplorer } from '@/components/crm/contract-lifecycle-explorer';
import type { RolePageProps } from '@/types/role-pages';

export function DashboardPage (props: RolePageProps) {
  return <div className="space-y-5"><BoardDashboardPage {...props}/><ContractLifecycleExplorer apiBase={props.apiBase} token={props.token} mode="board"/></div>;
}
