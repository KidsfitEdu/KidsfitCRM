'use client';

import { BoardPoliciesPage } from '../BoardPoliciesPage';
import type { RolePageProps } from '@/types/role-pages';

export function PoliciesPage (props: RolePageProps) {
  return <BoardPoliciesPage {...props}/>;
}
