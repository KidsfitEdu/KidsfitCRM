'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContractRenewalAccountingPanel } from '../Contracts/ContractRenewalAccountingPanel';

import type { RolePageProps } from '@/types/role-pages';
import { AccountingContractsPage } from '../Contracts/AccountingContractsPage';

/** Accounting contracts, receipts and commission overview; financial writes remain permission gated. */
export function RevenuePage({ apiBase, token, onChanged, abilities }: RolePageProps) {
  // A dedicated inbox uses the existing Accounting route; financial contract tabs remain untouched.
  const [renewals,setRenewals] = useState(false);
  return <div className="space-y-4">
    <nav aria-label="Nhóm hồ sơ Kế toán" className="flex flex-wrap gap-2">
      <Button type="button" variant={!renewals?'default':'outline'} aria-pressed={!renewals} onClick={()=>setRenewals(false)}>Hợp đồng & hoa hồng</Button>
      <Button type="button" variant={renewals?'default':'outline'} aria-pressed={renewals} onClick={()=>setRenewals(true)}>Hồ sơ tái ký</Button>
    </nav>
    {renewals?<ContractRenewalAccountingPanel apiBase={apiBase} token={token} abilities={abilities}/>:
      <AccountingContractsPage apiBase={apiBase} token={token} onChanged={onChanged} abilities={abilities}/>}
  </div>;
}
