'use client';

import { useState } from 'react';
import type { ManagerPageProps } from '@/types/manager-pages';
import { TeamPage } from './TeamPage';
import { ManagerCommissionPanel } from './ManagerCommissionPanel';

export function CommissionTeamPage(props:ManagerPageProps){
 const [tab,setTab]=useState<'team'|'commission'>('team');
 return <div className="space-y-5">
  <div className="flex gap-6 border-b border-border" role="tablist" aria-label="Đội ngũ và hoa hồng">
   {([{id:'team',label:'Nhân sự'},{id:'commission',label:'Phân bổ hoa hồng'}] as const).map(t=>
    <button key={t.id} type="button" role="tab" aria-selected={tab===t.id} onClick={()=>setTab(t.id)}
     className={'border-b-2 px-1 pb-3 pt-2 text-sm font-semibold '+(tab===t.id?'border-green-700 text-green-700':'border-transparent text-muted-foreground')}>
     {t.label}
    </button>)}
  </div>
  {tab==='team'?<TeamPage {...props}/>:<ManagerCommissionPanel {...props}/>}
 </div>;
}
