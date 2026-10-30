'use client';
import { ManagerOperationsPage } from '@/components/roles/ManagerOperationsPage';
import type { ManagerPageProps } from '@/types/manager-pages';
export function AllocationsPage(props:ManagerPageProps){return <ManagerOperationsPage section="allocations" {...props}/>;}
