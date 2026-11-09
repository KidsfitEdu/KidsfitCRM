'use client';

import { useState } from 'react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { ContractRenewalAccountingPanel } from '../Contracts/ContractRenewalAccountingPanel';
import { AccountingContractsPage } from '../Contracts/AccountingContractsPage';
import { ServiceInterruptionPanel } from '@/components/crm/ServiceInterruptionPanel';
import type { RolePageProps } from '@/types/role-pages';

type AccountingTab = 'contracts' | 'renewals' | 'history' | 'interruptions';

const tabs: { id: AccountingTab; label: string }[] = [
  { id: 'contracts', label: 'Hợp đồng' },
  { id: 'renewals', label: 'Hồ sơ tái ký' },
  { id: 'history', label: 'Lịch sử tài chính' },
  { id: 'interruptions', label: 'Gián đoạn dịch vụ' },
];

/** Shared Accounting page shell; tabs do not change financial permissions or API behavior. */
export function RevenuePage({ apiBase, token, onChanged, abilities }: RolePageProps) {
  const [tab, setTab] = useState<AccountingTab>('contracts');

  return <div className="min-w-0 space-y-5">
    <AppPageHeader
      eyebrow="KẾ TOÁN / KIDSFIT CRM"
      title="Hợp đồng & hoa hồng"
      description="Quản lý hợp đồng đã xác minh, hồ sơ tái ký, doanh thu và hoa hồng theo người phụ trách."
    />
    <nav aria-label="Chức năng Kế toán" className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border">
      {tabs.map(item => <button
        key={item.id}
        type="button"
        aria-current={tab === item.id ? 'page' : undefined}
        onClick={() => setTab(item.id)}
        className={`-mb-px border-b-2 px-1 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tab === item.id
          ? 'border-[#1b5e20] text-[#1b5e20] dark:border-green-400 dark:text-green-400'
          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}
      >{item.label}</button>)}
    </nav>
    {tab === 'interruptions'
      ? <ServiceInterruptionPanel apiBase={apiBase} token={token} mode="accounting"/>
      : tab === 'renewals'
      ? <ContractRenewalAccountingPanel apiBase={apiBase} token={token} abilities={abilities}/>
      : <AccountingContractsPage
          apiBase={apiBase}
          token={token}
          onChanged={onChanged}
          abilities={abilities}
          financialView={tab === 'history' ? 'HISTORY' : 'CURRENT'}
        />}
  </div>;
}
