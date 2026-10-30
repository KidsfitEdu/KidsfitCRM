'use client';
import { ManagerOperationsPage } from '@/src/components/roles/ManagerOperationsPage';
import type { ManagerPageProps } from '@/src/types/manager-pages';
export function ExtensionsPage(props:ManagerPageProps){return <ManagerOperationsPage section="extensions" {...props}/>;}
