'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelRequest, channelDate, channelQueryKeys } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

export function HandoverPage({apiBase,token,abilities,onChanged}:RolePageProps) {
  const allowed = !apiBase || abilities.includes('*') || abilities.includes('channel_sales.school.support.manage');
  const query = useQuery({
    queryKey:['care-handovers',token],
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1'),
    enabled:!!apiBase && !!token && allowed,
  });
  const [notes,setNotes]=useState<Record<number,string>>({});
  const [busy,setBusy]=useState<number|null>(null);
  const [error,setError]=useState('');
  const queryClient=useQueryClient();
  const respond=async(contractId:number,accept:boolean)=>{
    setBusy(contractId);setError('');
    try {
      await channelRequest(apiBase,token,'/contracts/'+contractId+'/care-handover/respond',{
        method:'POST',body:JSON.stringify({accept,note:notes[contractId]??''}),
      });
      await Promise.all([query.refetch(),queryClient.invalidateQueries({queryKey:channelQueryKeys.all}),onChanged()]);
    } catch(cause){setError(cause instanceof Error?cause.message:'Không thể phản hồi bàn giao.');}
    finally{setBusy(null);}
  };
  if(!allowed)return <p role="alert">Không có quyền tiếp nhận hồ sơ CSKH.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Trường bàn giao"
      description="Kiểm tra và xác nhận tiếp nhận hồ sơ; hoặc yêu cầu Quản lý bổ sung thông tin trước khi xác nhận."/>
    {!apiBase && <p className="rounded-xl border p-4 text-sm text-muted-foreground">Kết nối Backend để tiếp nhận hồ sơ thật.</p>}
    {(error||query.error)&&<p role="alert" className="rounded-xl border border-red-200 p-3 text-sm text-red-700">{error||query.error?.message}</p>}
    {query.isLoading&&<p className="text-sm text-muted-foreground">Đang tải bàn giao…</p>}
    {query.data?.care_handovers?.length===0&&<p className="rounded-xl border p-5 text-sm text-muted-foreground">Chưa có hồ sơ bàn giao.</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      {(query.data?.care_handovers??[]).map(h=><article key={h.id} className="space-y-3 rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-semibold">{h.customer_name}</h3><p className="text-xs text-muted-foreground">{h.contract_code} · {channelDate(h.created_at)}</p></div>
          <span className="rounded-full border px-2 py-1 text-xs">
            {h.acceptance_status==='ACCEPTED'?'Đã nhận':h.acceptance_status==='NEEDS_INFO'?'Cần bổ sung':'Chờ tiếp nhận'}
          </span>
        </div>
        <p className="text-sm">{h.reason}</p>
        {h.acceptance_note&&<p className="rounded-xl bg-muted p-3 text-sm">Ghi chú: {h.acceptance_note}</p>}
        {h.acceptance_status!=='ACCEPTED'&&h.assigned_user_id===query.data?.user_id&&!!apiBase&&<>
          <label htmlFor={'handover-'+h.id} className="block text-sm font-semibold">Ghi chú / thông tin cần bổ sung</label>
          <textarea id={'handover-'+h.id} rows={2} maxLength={4000} className="w-full rounded-xl border bg-background p-3 text-sm"
            value={notes[h.contract_id]??''} onChange={e=>setNotes(x=>({...x,[h.contract_id]:e.target.value}))}/>
          <div className="flex flex-wrap gap-2">
            <AppButton disabled={busy!==null} onClick={()=>void respond(h.contract_id,true)}>Xác nhận tiếp nhận</AppButton>
            <AppButton tone="outline" disabled={busy!==null||!(notes[h.contract_id]??'').trim()} onClick={()=>void respond(h.contract_id,false)}>Yêu cầu bổ sung</AppButton>
          </div>
        </>}
      </article>)}
    </div>
  </div>;
}
