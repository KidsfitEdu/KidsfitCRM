'use client';

import type { AdminPageProps } from '@/screens/Admin/types';
import { DashboardPage } from '@/screens/Admin/Dashboard/DashboardPage';
import { SchoolsPage } from '@/screens/Admin/Schools/SchoolsPage';
import { ProposalsPage } from '@/screens/Admin/Proposals/ProposalsPage';
import { PersonnelPage } from '@/screens/Admin/Personnel/PersonnelPage';
import { CapacitiesPage } from '@/screens/Admin/Capacities/CapacitiesPage';
import { PoliciesPage } from '@/screens/Admin/Policies/PoliciesPage';
import { ReportsPage } from '@/screens/Admin/Reports/ReportsPage';
import { AdminPageStatus } from '@/components/admin/AdminPageStatus';

export type AdminSection='dashboard'|'admin-schools'|'admin-proposals'|'admin-team'|'admin-capacity'|'admin-policies'|'admin-reports';
type Props=AdminPageProps&{section:AdminSection};

/** Temporary compatibility boundary for the existing state-driven CRM router.
 * All seven page bodies and their own data/form state live under src/screens/Admin.
 * AppProviders now owns the session-scoped QueryClient.
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
