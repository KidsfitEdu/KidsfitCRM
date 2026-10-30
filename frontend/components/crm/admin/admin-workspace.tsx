'use client';

import type { AdminPageProps } from '@/src/pages/Admin/types';
import { DashboardPage } from '@/src/pages/Admin/Dashboard/DashboardPage';
import { SchoolsPage } from '@/src/pages/Admin/Schools/SchoolsPage';
import { ProposalsPage } from '@/src/pages/Admin/Proposals/ProposalsPage';
import { PersonnelPage } from '@/src/pages/Admin/Personnel/PersonnelPage';
import { CapacitiesPage } from '@/src/pages/Admin/Capacities/CapacitiesPage';
import { PoliciesPage } from '@/src/pages/Admin/Policies/PoliciesPage';
import { ReportsPage } from '@/src/pages/Admin/Reports/ReportsPage';
import { AdminPageStatus } from '@/src/components/admin/AdminPageStatus';

export type AdminSection='dashboard'|'admin-schools'|'admin-proposals'|'admin-team'|'admin-capacity'|'admin-policies'|'admin-reports';
type Props=AdminPageProps&{section:AdminSection};

/** Temporary compatibility boundary for the existing state-driven CRM router.
 * All seven page bodies and their own data/form state live under src/pages/Admin.
 * Move the provider to AppProviders when the URL route migration is ready.
 */
export function AdminWorkspace({section,...props}:Props) {
  return <>
    {section==='dashboard'&&<DashboardPage {...props}/>}
    {section==='admin-schools'&&<SchoolsPage {...props}/>}
    {section==='admin-proposals'&&<ProposalsPage {...props}/>}
    {section==='admin-team'&&<PersonnelPage {...props}/>}
    {section==='admin-capacity'&&<AdminPageStatus apiBase={props.apiBase}><CapacitiesPage apiBase={props.apiBase} token={props.token} abilities={props.abilities}/></AdminPageStatus>}
    {section==='admin-policies'&&<PoliciesPage {...props}/>}
    {section==='admin-reports'&&<ReportsPage {...props}/>}
  </>;
}
