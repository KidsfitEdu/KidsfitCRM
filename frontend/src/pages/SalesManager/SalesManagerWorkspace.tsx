'use client';
import type { ManagerPageProps } from '@/types/manager-pages';
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
 const Page=pages[section];
 return <>{Page?<Page {...props}/>:<p role="alert">Không tìm thấy chức năng được yêu cầu.</p>}</>;
}
