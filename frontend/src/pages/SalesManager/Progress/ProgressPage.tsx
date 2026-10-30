'use client';
import { ManagerOperationsPage } from '@/src/components/roles/ManagerOperationsPage';
import type { ManagerPageProps } from '@/src/types/manager-pages';
export function ProgressPage(props:ManagerPageProps){return <ManagerOperationsPage section="progress" {...props}/>;}
