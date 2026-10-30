'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, ClipboardList, CalendarClock, Handshake, TrendingUp, UsersRound } from 'lucide-react';
import { AppStatCard } from '@/components/common/app-stat-card';
import { fetchAdminOperations } from '@/services/proposal.service';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import { AdminPageStatus } from '@/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function DashboardPage({apiBase,token,workspace}:AdminPageProps) {
  const [operations,setOperations]=useState<SchoolOperationsWorkspace|null>(null);
  const [error,setError]=useState('');
  const preview=!apiBase;
  const reload=useCallback(async()=>{
    if(preview||!token)return;
    try {setError('');setOperations(await fetchAdminOperations(apiBase,token,1,''));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được dữ liệu.');}
  },[apiBase,token,preview]);
  useEffect(()=>{void reload();},[reload]);
  const pending=operations?.proposals.filter(p=>p.status==='PENDING_ADMIN').length??0;
  const metrics=workspace.metrics;
  const fmt=(value:number)=>value.toLocaleString('vi-VN');
  const panel='crm-brand-surface rounded-2xl border border-border/80 bg-card p-5';
  return <AdminPageStatus apiBase={apiBase} error={error}>
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {([
          ['Tổng khách hàng CRM', metrics.available + metrics.approaching + metrics.contracted],
          ['Chưa đăng ký', metrics.available],
          ['Đang tiếp cận', metrics.approaching],
          ['Đã ký hợp đồng', metrics.contracted],
          ['Sắp hết hạn tiếp cận', metrics.expiring_soon],
          ['Đề xuất chờ Admin', operations ? pending : null],
        ] as [string,number|null][]).map(([label,value], index) => <AppStatCard key={label} label={label} value={preview || value === null ? '—' : fmt(value)} icon={[Building2, ClipboardList, CalendarClock, Handshake, TrendingUp, UsersRound][index % 6]}/>)}
      </div>
      <div className={panel}><h3 className="font-semibold">Công việc cần xử lý</h3><p className="mt-2 text-sm text-muted-foreground">Hồ sơ đề xuất chờ duyệt: {preview || !operations ? '—' : fmt(pending)}. Mở mục Đề xuất trường để xử lý.</p></div>
    </>
  </AdminPageStatus>;
}
