'use client';
import { ManagerOperationsPage } from '@/components/roles/ManagerOperationsPage';
import type { ManagerPageProps } from '@/types/manager-pages';
export function ExtensionsPage(props:ManagerPageProps){return <ManagerOperationsPage section="extensions" {...props}/>;}
