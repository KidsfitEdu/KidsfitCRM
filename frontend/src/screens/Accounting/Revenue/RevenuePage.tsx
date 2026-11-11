'use client';

import { AppPageHeader } from '@/components/common/app-page-header';
import { AccountingContractsPage } from '../Contracts/AccountingContractsPage';
import type { RolePageProps } from '@/types/role-pages';

/** One accounting contract workspace: renewals, financials and GI-01 in one list and Drawer. */
export function RevenuePage({apiBase,token,onChanged,abilities}:RolePageProps){
  return <div className="min-w-0 space-y-5">
    <AppPageHeader
      eyebrow="KẾ TOÁN / KIDSFIT CRM"
      title="Hợp đồng & hoa hồng"
      description="Theo dõi kỳ sử dụng, xử lý tái ký và đối soát tài chính trong một danh sách hợp đồng."
    />
    <AccountingContractsPage apiBase={apiBase} token={token}
      onChanged={onChanged} abilities={abilities}/>
  </div>;
}
