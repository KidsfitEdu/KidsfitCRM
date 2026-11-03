'use client';

import { BoardDashboardPage } from '../BoardDashboardPage';
import type { RolePageProps } from '@/types/role-pages';

export function DashboardPage (props: RolePageProps) {
  return <BoardDashboardPage {...props}/>;
}
