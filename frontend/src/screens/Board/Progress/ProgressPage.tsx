'use client';
import type { RolePageProps } from '@/types/role-pages';
import { BoardProgressPage } from '../BoardProgressPage';

export function ProgressPage(props:RolePageProps) {
  return <BoardProgressPage {...props}/>;
}
