'use client';
import { ManagerOperationsPage } from '@/src/components/roles/ManagerOperationsPage';
import type { ManagerPageProps } from '@/src/types/manager-pages';
export function ProposalsPage(props:ManagerPageProps){return <ManagerOperationsPage section="proposals" {...props}/>;}
