'use client';

import { useEffect, useState } from 'react';
import { SalesProtectionOverview } from '@/components/crm/SalesProtectionOverview';
import type { RolePageProps } from '@/types/role-pages';
import { rolePageSections } from '@/config/role-pages';
import { DashboardPage } from './Dashboard/DashboardPage';
import { SchoolsPage } from './Schools/SchoolsPage';
import { ProposalsPage } from './Proposals/ProposalsPage';
import { InvitationsPage } from './Invitations/InvitationsPage';
import { ApproachesPage } from './Approaches/ApproachesPage';
import { ExtensionsPage } from './Extensions/ExtensionsPage';
import { IncomePage } from './Income/IncomePage';

export type RoleSection = keyof typeof rolePageSections.Collaborator;
type Props = RolePageProps & {section: RoleSection};
const pages = {
  dashboard: DashboardPage,
  schools: SchoolsPage,
  proposals: ProposalsPage,
  invitations: InvitationsPage,
  approaches: ApproachesPage,
  extensions: ExtensionsPage,
  income: IncomePage,
};

/** Existing view IDs are preserved; each page owns its UI entrypoint. */
export function CollaboratorWorkspace({section, ...props}: Props) {
  const Page = pages[section];
  const [subview,setSubview]=useState<'consultation'|'protection'>('consultation');
  useEffect(()=>setSubview('consultation'),[section]);
  if (!Page) return <p role="alert">Không tìm thấy chức năng được yêu cầu.</p>;
  if (section!=='approaches' || !props.apiBase || !props.token) return <Page {...props}/>;
  return <div className="space-y-5">
    <nav aria-label="Nhóm công việc CTV" className="flex flex-wrap gap-5 border-b border-border">
      {[
        {id:'consultation',label:'Tiếp cận & tư vấn'},
        {id:'protection',label:'Quản lý quyền bảo vệ'}
      ].map(item=><button key={item.id} type="button" onClick={()=>setSubview(item.id as typeof subview)}
        aria-current={subview===item.id?'page':undefined}
        className={`-mb-px border-b-2 px-1 py-3 text-sm font-semibold ${subview===item.id
          ? 'border-[#1b5e20] text-[#1b5e20] dark:border-green-400 dark:text-green-400'
          : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
        {item.label}
      </button>)}
    </nav>
    {subview==='protection'
      ? <SalesProtectionOverview apiBase={props.apiBase} token={props.token}/>
      : <Page {...props}/>}
  </div>;
}
