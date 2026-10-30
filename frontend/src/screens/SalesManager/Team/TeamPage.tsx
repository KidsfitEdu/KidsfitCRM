'use client';
import { ManagerOperationsPage } from '@/components/roles/ManagerOperationsPage';
import type { ManagerPageProps } from '@/types/manager-pages';
export function TeamPage(props:ManagerPageProps){return <ManagerOperationsPage section="team" {...props}/>;}
