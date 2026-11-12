'use client';

import { useState } from 'react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { BoardPoliciesPage } from '../BoardPoliciesPage';
import { BoardCommissionPoliciesPanel } from '../BoardCommissionPoliciesPanel';
import type { RolePageProps } from '@/types/role-pages';

export function PoliciesPage(props: RolePageProps) {
  const [tab,setTab] = useState<'commission'|'operations'>('commission');
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Quản lý chính sách"
      description="Cấu hình hạn mức hoa hồng và chính sách vận hành theo phạm vi được phân quyền."/>
    <div role="tablist" aria-label="Nhóm chính sách" className="flex flex-wrap gap-6 border-b border-border">
      {([{id:'commission',label:'Chính sách hoa hồng'},{id:'operations',label:'Chính sách vận hành'}] as const).map(t=>
        <button key={t.id} type="button" role="tab" aria-selected={tab===t.id}
          onClick={()=>setTab(t.id)} className={'border-b-2 px-1 pb-3 pt-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 '+(tab===t.id?'border-green-700 text-green-700':'border-transparent text-muted-foreground hover:text-foreground')}>
          {t.label}
        </button>)}
    </div>
    {tab==='commission'?<BoardCommissionPoliciesPanel {...props}/>:<BoardPoliciesPage {...props} embedded/>}
  </div>;
}
