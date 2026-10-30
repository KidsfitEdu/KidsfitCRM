'use client';
import { useState } from 'react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import type { ManagerPageProps } from '@/src/types/manager-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { ProposalsPage } from './Proposals/ProposalsPage';
import { AllocationsPage } from './Allocations/AllocationsPage';
import { ProgressPage } from './Progress/ProgressPage';
import { ExtensionsPage } from './Extensions/ExtensionsPage';
import { TeamPage } from './Team/TeamPage';
export type ManagerSection='manager-dashboard'|'manager-proposals'|'manager-allocations'|'manager-progress'|'manager-extensions'|'manager-team';
const pages={
 'manager-dashboard':DashboardPage,
 'manager-proposals':ProposalsPage,
 'manager-allocations':AllocationsPage,
 'manager-progress':ProgressPage,
 'manager-extensions':ExtensionsPage,
 'manager-team':TeamPage,
};
export function SalesManagerWorkspace({section,...props}:ManagerPageProps&{section:ManagerSection}){
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000}}}));
 const Page=pages[section];
 return <QueryClientProvider client={client}>{Page?<Page {...props}/>:<p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}</QueryClientProvider>;
}
