'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ShieldMinus } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelDate, channelRequest } from '@/lib/channel-operations';

type Preview = {
  member: {id:number;name:string;status:string;account_status:string};
  summary: {active_claims:number;revoke_approaches:number;protected_contract_approaches:number;
    pending_invitations:number;pending_extensions:number;contracts:number;awaiting_verification:number;can_handover:boolean};
  claims: {id:number;school_name:string;protected_until:string;has_contract:boolean;next_follow_up_at:string|null}[];
  contracts: {id:number;contract_code:string;school_name:string;status:string}[];
  handovers: {id:number;created_at:string;reason:string;revoked_registrations:number}[];
};

type Props={apiBase:string;token:string;membershipId:number|null;onClose:()=>void;
  onChanged:()=>Promise<void>;onAllocate:()=>void};

export function SalesHandoverDrawer({apiBase,token,membershipId,onClose,onChanged,onAllocate}:Props){
  const [preview,setPreview]=useState<Preview|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [reason,setReason]=useState('');
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [success,setSuccess]=useState('');
  const load=useCallback(async(id:number)=>{
    setLoading(true);setError('');
    try{setPreview(await channelRequest<Preview>(apiBase,token,'/manager/team/'+id+'/handover-preview'));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được hồ sơ bàn giao.');}
    finally{setLoading(false);}
  },[apiBase,token]);
  useEffect(()=>{
    if(membershipId===null){setPreview(null);setReason('');setSuccess('');setError('');return;}
    void load(membershipId);
  },[membershipId,load]);
  const submit=async()=>{
    if(membershipId===null||!reason.trim()||!preview?.summary.can_handover||busy)return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/school-approach-releases/'+membershipId,{method:'POST',body:JSON.stringify({
        idempotency_key:crypto.randomUUID(),reason:reason.trim(),
      })});
      setConfirm(false);
      setSuccess('Đã thu hồi quyền tiếp cận đủ điều kiện, hủy lời mời phân bổ và gia hạn đang chờ. Hợp đồng, hoa hồng và tài khoản Sales giữ nguyên.');
      await onChanged();
      await load(membershipId);
    }catch(e){setConfirm(false);setError(e instanceof Error?e.message:'Không thể thu hồi quyền tiếp cận.');}
    finally{setBusy(false);}
  };
  return <>
    <AppDrawer wide open={membershipId!==null} onOpenChange={open=>{if(!open&&!busy)onClose();}}
      title="Thu hồi quyền tiếp cận của Sales" description={preview?.member.name??'Kiểm tra các trường và yêu cầu đang chờ'}
      busy={busy} footer={<div className="flex flex-wrap justify-end gap-2">
        <AppButton tone="neutral" disabled={busy} onClick={onClose}>Đóng</AppButton>
        {success?<AppButton leadingIcon={<ArrowRight className="size-4"/>} onClick={onAllocate}>Phân bổ trường</AppButton>:
          <AppButton tone="danger" disabled={loading||busy||!preview?.summary.can_handover||!reason.trim()||!((preview.summary.revoke_approaches+preview.summary.pending_invitations+preview.summary.pending_extensions)>0)}
            leadingIcon={<ShieldMinus className="size-4"/>} onClick={()=>setConfirm(true)}>Thu hồi quyền tiếp cận</AppButton>}
      </div>}>
      <div className="space-y-5 text-sm">
        {loading&&<output className="block text-muted-foreground">Đang kiểm tra trường, hợp đồng và lịch hẹn…</output>}
        {error&&<p role="alert" className="rounded-xl border border-red-300 p-3 text-red-700">{error}</p>}
        {success&&<output className="block rounded-xl border border-green-300 bg-green-50 p-3 text-green-800">{success}</output>}
        {preview&&<>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['Trường sẽ thu hồi',preview.summary.revoke_approaches],
              ['Trường gắn hợp đồng',preview.summary.protected_contract_approaches],
              ['Hợp đồng chờ xử lý',preview.summary.awaiting_verification],
              ['Lời mời chờ',preview.summary.pending_invitations],
              ['Gia hạn chờ',preview.summary.pending_extensions],
              ['Tổng hợp đồng',preview.summary.contracts],
            ].map(([label,value])=><div key={String(label)} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
            </div>)}
          </div>
          <section className="space-y-2">
            <h3 className="font-semibold">Trường đang tiếp cận</h3>
            {preview.claims.length===0&&<p className="text-muted-foreground">Không có lượt tiếp cận hoạt động.</p>}
            {preview.claims.map(c=><div key={c.id} className="rounded-xl border p-3">
              <p className="font-semibold">{c.school_name}</p>
              <p className="text-xs text-muted-foreground">Hạn bảo vệ: {channelDate(c.protected_until)}
                {c.next_follow_up_at?' · Hẹn tiếp: '+channelDate(c.next_follow_up_at):''}</p>
              <p className="mt-1 text-xs">{c.has_contract?'Giữ hồ sơ hợp đồng, không thu hồi tự động':'Thu hồi quyền tiếp cận chưa ký'}</p>
            </div>)}
          </section>
          <section className="space-y-2">
            <h3 className="font-semibold">Hợp đồng và quyền lợi giữ nguyên</h3>
            {preview.contracts.length===0&&<p className="text-muted-foreground">Chưa có hợp đồng.</p>}
            {preview.contracts.map(c=><p key={c.id} className="rounded-xl border p-3">
              <span className="font-medium">{c.school_name} · {c.contract_code}</span>
              <span className="block text-xs text-muted-foreground">Trạng thái: {c.status} · Người hưởng hoa hồng không thay đổi</span>
            </p>)}
            {preview.summary.contracts>preview.contracts.length&&
              <p className="text-xs text-muted-foreground">Hiển thị 100 hợp đồng gần nhất; tổng số được tính đầy đủ.</p>}
          </section>
          {!success&&preview.summary.can_handover&&<>
            <label className="block font-semibold" htmlFor="release-reason">Lý do thu hồi quyền tiếp cận *</label>
            <textarea id="release-reason" className="w-full rounded-xl border bg-background p-3" rows={2} maxLength={2000}
              value={reason} onChange={e=>setReason(e.target.value)} placeholder="Nhập lý do thu hồi"/>
          </>}
          {preview.handovers.length>0&&<section className="space-y-2">
            <h3 className="font-semibold">Lịch sử thu hồi / bàn giao</h3>
            {preview.handovers.map(h=><p key={h.id} className="border-b py-2">
              {channelDate(h.created_at)} · {h.reason} · {h.revoked_registrations} lượt tiếp cận thu hồi
            </p>)}
          </section>}
        </>}
      </div>
    </AppDrawer>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} busy={busy} destructive
      title="Xác nhận thu hồi quyền tiếp cận" confirmLabel="Xác nhận thu hồi"
      description={'Thu hồi '+(preview?.summary.revoke_approaches??0)+' lượt tiếp cận đủ điều kiện, hủy '+(preview?.summary.pending_invitations??0)+' lời mời phân bổ và '+(preview?.summary.pending_extensions??0)+' gia hạn đang chờ. Không khóa Sales; hợp đồng và hoa hồng giữ nguyên.'}
      onConfirm={()=>void submit()}/>
  </>;
}
