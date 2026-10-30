'use client';

import { useCallback,useEffect,useState } from 'react';
import { Input } from '@/components/ui/input';
import { currentBusinessPeriod } from '@/lib/channel-operations';
import type { SchoolOperationsReport } from '@/lib/school-operations';
import { fetchAdminReport } from '@/src/services/report.service';
import { AdminPageStatus } from '@/src/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function ReportsPage({apiBase,token}:AdminPageProps) {
  const [report,setReport]=useState<SchoolOperationsReport|null>(null);
  const [period,setPeriod]=useState(currentBusinessPeriod);const [error,setError]=useState('');const [,setBusy]=useState(false);
  const preview=!apiBase;const panel='crm-brand-surface rounded-2xl border border-border/80 bg-card p-5';
  const reload=useCallback(async()=>{
    if(preview||!token)return;setBusy(true);setError('');
    try{setReport(await fetchAdminReport(apiBase,token,period));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được dữ liệu.');}finally{setBusy(false);}
  },[apiBase,token,preview,period]);
  useEffect(()=>{void reload();},[reload]);

  return <AdminPageStatus apiBase={apiBase} error={error}>
    <div className={panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Báo cáo vận hành</h3><Input className="max-w-44" type="month" aria-label="Kỳ báo cáo" value={period} onChange={e=>setPeriod(e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><Summary label="Trường chưa đăng ký" value={report?.available_schools ?? null}/><Summary label="Hợp đồng đang hiệu lực" value={report?.active_contracts ?? null}/><Summary label="Đề xuất quá hạn" value={report?.overdue_proposals ?? null}/><Summary label="Tiếp cận hết hạn" value={report?.expired_approaches ?? null}/></div>
      <p className="mt-4 text-sm text-muted-foreground">Lịch sử chỉnh sửa từng trường và đề xuất được kiểm soát theo quyền truy cập của hồ sơ tương ứng.</p>
    </div>
  </AdminPageStatus>;
}

function Summary({label,value}:{label:string;value:number|null}) { return <div className={panelClass}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value===null?'—':value.toLocaleString('vi-VN')}</p></div>; }
const panelClass='crm-brand-surface rounded-2xl border border-border/80 bg-card p-5';
