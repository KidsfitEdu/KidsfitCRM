'use client';
import { ManagerOperationsPage } from '@/components/roles/ManagerOperationsPage';
import type { ManagerPageProps } from '@/types/manager-pages';
export function ProposalsPage(props:ManagerPageProps){return <ManagerOperationsPage section="proposals" {...props}/>;}
