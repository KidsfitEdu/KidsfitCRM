'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppPageHeader } from '@/components/common/app-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

type Eligible = {id:number;contract_code:string;school_name:string;
  source_end_on:string|null;latest_end_on:string|null;pending:boolean};
type Renewal = {id:number;renewal_no:number;signed_on:string;service_start_on:string;
  service_end_on:string;payment_cycle:string;total_value:number;status:string;
  decision_reason:string|null;submitted_at:string|null};
const statuses: Record<string,string> = {
  PENDING_ACCOUNTING:'Đang chờ Kế toán', NEEDS_INFO:'Cần bổ sung', CONFIRMED:'Đã xác nhận', REJECTED:'Đã từ chối'
};
const localDay = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export function ContractRenewalSalesPanel({apiBase,token,abilities}:{apiBase:string;token:string;abilities:string[]}) {
  const [eligible,setEligible]=useState<Eligible[]>([]);
  const [contractId,setContractId]=useState('');
  const [rows,setRows]=useState<Renewal[]>([]);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [signedOn,setSignedOn]=useState(localDay());
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [cycle,setCycle]=useState('YEARLY');
  const [amount,setAmount]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [returnId,setReturnId]=useState<number|null>(null);
  const canSubmit=abilities.includes('channel_sales.renewal.submit')||abilities.includes('*');
  const load=useCallback(async()=>{
    if(!apiBase||!token||!canSubmit)return;
    setLoading(true);
    try{
      const result=await channelRequest<{data:Eligible[]}>(apiBase,token,'/renewals/eligible');
      setEligible(result.data);
    }catch(e){appNotice.error('Không tải được danh sách hợp đồng được phép tái ký.',e instanceof Error?e.message:'Vui lòng thử lại.');}
    finally{setLoading(false);}
  },[apiBase,token,canSubmit]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!contractId){setRows([]);return;}
    let live=true;
    void channelRequest<{data:Renewal[]}>(apiBase,token,`/contracts/${contractId}/renewals`)
      .then(result=>{if(live)setRows(result.data);})
      .catch(e=>{if(live)appNotice.error('Không tải được hồ sơ tái ký.',e instanceof Error?e.message:'Vui lòng thử lại.');});
    return()=>{live=false;};
  },[apiBase,token,contractId]);
  const selected=eligible.find(x=>String(x.id)===contractId);
  const send=async(e:SyntheticEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!contractId||!file||!start||!end||!signedOn||!amount){appNotice.error('Vui lòng nhập đầy đủ thông tin và hợp đồng đã ký.');return;}
    if(end<start){appNotice.error('Ngày kết thúc không thể trước ngày bắt đầu.');return;}
    setSaving(true);
    try{
      const form=new FormData();form.set('kind','RENEWAL');form.set('file',file);
      const proof=await channelRequest<{data:{id:number}}>(apiBase,token,'/evidence',{method:'POST',body:form});
      const payload={idempotency_key:crypto.randomUUID(),signed_on:signedOn,
        service_start_on:start,service_end_on:end,payment_cycle:cycle,total_value:Number(amount),evidence_id:proof.data.id};
      await channelRequest(apiBase,token,returnId?`/renewals/${returnId}/resubmit`:`/contracts/${contractId}/renewals`,
        {method:'POST',body:JSON.stringify(payload)});
      appNotice.success('Đã gửi hồ sơ tái ký trực tiếp Kế toán.');
      setFile(null);setAmount('');setStart('');setEnd('');setReturnId(null);
      await load();
      const updated=await channelRequest<{data:Renewal[]}>(apiBase,token,`/contracts/${contractId}/renewals`);
      setRows(updated.data);
    }catch(err){appNotice.error('Không gửi được hồ sơ tái ký.',err instanceof Error?err.message:'Vui lòng thử lại.');}
    finally{setSaving(false);}
  };
  return <section className="space-y-5 p-4 sm:p-5">
    <AppPageHeader eyebrow="BÁN HÀNG / KIDSFIT CRM" title="Hợp đồng tái ký"
      description="Gửi trực tiếp Kế toán, không qua Quản lý hay CHECKEE. Việc tái ký không tự kéo dài quyền bảo vệ 5 năm."/>
    {!canSubmit?<p role="alert">Tài khoản chưa có quyền gửi tái ký.</p>:<>
      <label htmlFor="kc02-contract" className="block space-y-2 text-sm">
        <span className="font-medium">Hợp đồng được phép tái ký</span>
        <select id="kc02-contract" className="w-full rounded-lg border bg-background p-2"
          value={contractId} onChange={e=>{setContractId(e.target.value);setReturnId(null);}}>
          <option value="">Chọn hợp đồng...</option>
          {eligible.map(x=><option key={x.id} value={x.id}>{x.school_name} · {x.contract_code}</option>)}
        </select>
      </label>
      {loading&&<p className="text-sm text-muted-foreground">Đang tải hợp đồng...</p>}
      {selected&&<div className="rounded-lg border p-3 text-sm">
        <p><strong>Kỳ gần nhất:</strong> {selected.latest_end_on?channelDate(selected.latest_end_on):
          selected.source_end_on?channelDate(selected.source_end_on):'Chưa có hạn dịch vụ từ KC-01'}</p>
        {selected.pending&&<p className="mt-1 text-amber-700">Có hồ sơ đang chờ xử lý, không tạo hồ sơ trùng.</p>}
      </div>}
      {rows.length>0&&<div className="space-y-2">
        <h3 className="font-semibold">Lịch sử hồ sơ tái ký</h3>
        {rows.map(r=><div key={r.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>Lần {r.renewal_no} · {statuses[r.status]??r.status}</strong>
            <span>{channelDate(r.service_start_on)} – {channelDate(r.service_end_on)}</span>
          </div>
          <p className="mt-1">{channelMoney(r.total_value)} · {r.payment_cycle==='MONTHLY'?'Theo tháng':'Theo năm'}</p>
          {r.decision_reason&&<p className="mt-1 text-amber-700">Phản hồi: {r.decision_reason}</p>}
          {r.status==='NEEDS_INFO'&&<Button variant="outline" size="sm" className="mt-2" type="button"
            onClick={()=>{setReturnId(r.id);setSignedOn(r.signed_on.slice(0,10));setStart(r.service_start_on.slice(0,10));
              setEnd(r.service_end_on.slice(0,10));setCycle(r.payment_cycle);setAmount(String(r.total_value));}}>
            Bổ sung hồ sơ này
          </Button>}
        </div>)}
      </div>}
      {selected&&(returnId!==null||!selected.pending)&&<form className="space-y-3 rounded-xl border p-4" onSubmit={send}>
        <h3 className="font-semibold">{returnId?'Gửi lại hồ sơ cần bổ sung':'Gửi hợp đồng tái ký'}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor="kc02-signed" className="space-y-1 text-sm">Ngày ký *<Input id="kc02-signed" type="date" required value={signedOn} onChange={e=>setSignedOn(e.target.value)}/></label>
          <label htmlFor="kc02-start" className="space-y-1 text-sm">Ngày bắt đầu dịch vụ *<Input id="kc02-start" type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label>
          <label htmlFor="kc02-end" className="space-y-1 text-sm">Ngày kết thúc theo hợp đồng *<Input id="kc02-end" type="date" required value={end} onChange={e=>setEnd(e.target.value)}/></label>
          <label htmlFor="kc02-cycle" className="space-y-1 text-sm">Chu kỳ thanh toán *
            <select id="kc02-cycle" className="block w-full rounded-lg border bg-background p-2" value={cycle} onChange={e=>setCycle(e.target.value)}>
              <option value="MONTHLY">Theo tháng</option><option value="YEARLY">Theo năm</option>
            </select>
          </label>
          <label htmlFor="kc02-amount" className="space-y-1 text-sm">Giá trị kỳ tái ký (VNĐ) *<Input id="kc02-amount" type="number" min="1" step="1" required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
          <label htmlFor="kc02-file" className="space-y-1 text-sm">File hợp đồng đã ký (PDF hoặc ảnh, tối đa 5 MB) *
            <Input id="kc02-file" type="file" accept=".pdf,image/jpeg,image/png,image/webp" required
              onChange={e=>setFile(e.target.files?.[0]??null)}/>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Ngày kết thúc phải theo chứng từ đã ký; không tự gia hạn quyền Sales hoặc ghi nhận khoản thu.</p>
        <Button disabled={saving} type="submit">{saving?'Đang gửi...':'Gửi trực tiếp Kế toán'}</Button>
      </form>}
    </>}
  </section>;
}
