'use client';

import { BoardReportsPage } from '../BoardReportsPage';
import type { RolePageProps } from '@/types/role-pages';

export function OversightPage (props: RolePageProps) {
  return <BoardReportsPage {...props}/>;
}
