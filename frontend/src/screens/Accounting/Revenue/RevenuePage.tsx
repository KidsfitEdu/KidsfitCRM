'use client';

import { AccountingContractsPage } from '../Contracts/AccountingContractsPage';
import type { RolePageProps } from '@/types/role-pages';

/** One accounting contract workspace: renewals, financials and GI-01 in one list and Drawer. */
export function RevenuePage({apiBase,token,onChanged,abilities}:RolePageProps){
  return <div className="min-w-0 space-y-5">
    <AccountingContractsPage apiBase={apiBase} token={token}
      onChanged={onChanged} abilities={abilities}/>
  </div>;
}
