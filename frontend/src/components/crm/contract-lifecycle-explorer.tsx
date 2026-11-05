'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import { AppButton } from '@/components/common/buttons/app-button';
import { appNotice } from '@/components/common/app-toast-provider';
import { Input } from '@/components/ui/input';
import { channelDate, channelRequest } from '@/lib/channel-operations';

type Contract = { id: number; contract_code: string; school_name: string | null;
  signed_on: string; protection_until: string | null; service_end_on: string | null };
type Term = { id: number; contract_id: number; term_number: number;
  start_on: string; end_on: string; billing_cycle: string; status: string;
  evidence_reference: string; verified_at: string | null };
type Mode = 'sales' | 'manager' | 'checkee' | 'care' | 'accounting' | 'board';
const labels: Record<string,string> = {
  PENDING_MANAGER:'Chờ Quản lý', PENDING_CHECKEE:'Chờ CHECKEE xác minh',
  ACTIVE:'Đã xác minh', REJECTED:'Đã từ chối'
};

export function ContractLifecycleExplorer({ apiBase, token, mode }: {
  apiBase:string; token:string; mode:Mode
}) {
  const [contracts,setContracts]=useState<Contract[]>([]);
  const [terms,setTerms]=useState<Term[]>([]);
  const [selected,setSelected]=useState('');
  const [startOn,setStartOn]=useState('');
  const [endOn,setEndOn]=useState('');
  const [cycle,setCycle]=useState('YEARLY');
  const [evidence,setEvidence]=useState('');
  const [invalid,setInvalid]=useState('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!apiBase||!token)return;
    let live=true;
    void Promise.all([
      channelRequest<{data:Contract[]}>(apiBase,token,'/contract-lifecycle/contracts'),
      channelRequest<{data:Term[]}>(apiBase,token,'/contract-lifecycle/terms'),
    ]).then(([a,b])=>{
      if(live){setContracts(Array.isArray(a.data)?a.data:[]);setTerms(Array.isArray(b.data)?b.data:[]);}
    }).catch(err=>{
      if(live)appNotice.error('Không tải được kỳ hợp đồng.',err instanceof Error?err.message:'Vui lòng thử lại.');
    });
    return()=>{live=false;};
  },[apiBase,token,revision]);

  const submit=async(event:SyntheticEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const contractId=Number(selected);
    if(!contractId||!startOn||!endOn||endOn<startOn||!evidence.trim()){
      setInvalid('Chọn hợp đồng, ngày bắt đầu/kết thúc hợp lệ và mã hồ sơ tái ký.');return;
    }
    setInvalid('');setBusy(true);
    try{
      await channelRequest(apiBase,token,`/contracts/${contractId}/service-terms`,{
        method:'POST',body:JSON.stringify({
          start_on:startOn,end_on:endOn,billing_cycle:cycle,evidence_reference:evidence.trim()
        })
      });
      setEvidence('');setSelected('');setStartOn('');setEndOn('');
      appNotice.success('Đã gửi kỳ hợp đồng cho Quản lý kiểm tra.');
      setRevision(n=>n+1);
    }catch(err){appNotice.error('Không gửi được hồ sơ tái ký.',err instanceof Error?err.message:'Vui lòng thử lại.');}
    finally{setBusy(false);}
  };

  const decide=async(id:number,approve:boolean)=>{
    if(busy)return;
    if(!approve&&!reason.trim()){setInvalid('Cần nhập lý do từ chối.');return;}
    setInvalid('');setBusy(true);
    try{
      await channelRequest(apiBase,token,
        `/contract-lifecycle/terms/${id}/${mode==='manager'?'manager-review':'checkee-review'}`,{
          method:'POST',body:JSON.stringify({approve,reason:approve?null:reason.trim()})
        });
      appNotice.success(approve?'Đã chuyển/xác minh kỳ hợp đồng.':'Đã từ chối hồ sơ.');
      setReason('');setRevision(n=>n+1);
    }catch(err){appNotice.error('Không xử lý được kỳ hợp đồng.',err instanceof Error?err.message:'Vui lòng thử lại.');}
    finally{setBusy(false);}
  };

  const actionable=mode==='manager'?'PENDING_MANAGER':mode==='checkee'?'PENDING_CHECKEE':null;
  return <section className="space-y-4 rounded-xl border border-border bg-card p-4">
    <div>
      <h3 className="font-bold text-foreground">Kỳ hợp đồng & gia hạn phần mềm</h3>
      <p className="mt-1 text-sm text-muted-foreground">Kỳ sử dụng phần mềm và bảo vệ Sales 5 năm được quản lý độc lập; tái ký không tự động gia hạn quyền bảo vệ.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[630px] text-left text-sm">
        <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2">Hợp đồng</th><th className="p-2">Hạn phần mềm</th><th className="p-2">Bảo vệ Sales</th></tr></thead>
        <tbody>{contracts.map(c=><tr key={c.id} className="border-b">
          <td className="p-2"><strong>{c.school_name??c.contract_code}</strong><p className="text-xs">{c.contract_code}</p></td>
          <td className="p-2">{c.service_end_on?channelDate(c.service_end_on):'Chưa khai báo kỳ hợp lệ'}</td>
          <td className="p-2">{c.protection_until?channelDate(c.protection_until):'Chưa ghi nhận quyền bảo vệ'}</td>
        </tr>)}</tbody>
      </table>
      {!contracts.length&&<p className="p-3 text-sm text-muted-foreground">Chưa có hợp đồng được xác minh trong phạm vi tài khoản.</p>}
    </div>
    <h4 className="text-sm font-semibold">Lịch sử kỳ sử dụng và xác minh</h4>
    {terms.slice(0,30).map(t=><div key={t.id} className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span><strong>{contracts.find(c=>c.id===t.contract_id)?.contract_code??'Hợp đồng #'+t.contract_id}</strong> · Kỳ {t.term_number}</span>
        <span className="text-muted-foreground">{labels[t.status]??t.status}</span>
      </div>
      <p className="mt-1">{channelDate(t.start_on)} – {channelDate(t.end_on)} · {t.billing_cycle==='MONTHLY'?'Thanh toán tháng':'Thanh toán năm'}</p>
      <p className="mt-1 break-all text-xs text-muted-foreground">Hồ sơ: {t.evidence_reference}</p>
      {actionable===t.status&&<div className="mt-2 flex flex-wrap gap-2">
        <AppButton disabled={busy} onClick={()=>void decide(t.id,true)}>Xác nhận</AppButton>
        <AppButton tone="outline" disabled={busy} onClick={()=>void decide(t.id,false)}>Từ chối</AppButton>
      </div>}
    </div>)}
    {actionable&&<div className="space-y-1">
      <label htmlFor="service-term-decision-reason" className="text-sm font-medium">Lý do từ chối (khi cần)</label>
      <Input id="service-term-decision-reason" value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)}/>
    </div>}
    {mode==='sales'&&<form noValidate className="space-y-3 rounded-lg border p-3" onSubmit={event=>void submit(event)}>
      <h4 className="font-semibold">Gửi hồ sơ kỳ hợp đồng / tái ký</h4>
      <label className="block space-y-1 text-sm"><span>Hợp đồng đã xác minh *</span>
        <select className="w-full rounded-lg border bg-background p-2" value={selected} onChange={e=>setSelected(e.target.value)}>
          <option value="">Chọn hợp đồng</option>
          {contracts.map(c=><option key={c.id} value={c.id}>{c.contract_code} · {c.school_name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label htmlFor="service-term-start" className="space-y-1 text-sm"><span>Ngày bắt đầu *</span><Input id="service-term-start" type="date" value={startOn} onChange={e=>setStartOn(e.target.value)}/></label>
        <label htmlFor="service-term-end" className="space-y-1 text-sm"><span>Ngày kết thúc *</span><Input id="service-term-end" type="date" value={endOn} onChange={e=>setEndOn(e.target.value)}/></label>
      </div>
      <label className="block space-y-1 text-sm"><span>Chu kỳ thanh toán *</span>
        <select className="w-full rounded-lg border bg-background p-2" value={cycle} onChange={e=>setCycle(e.target.value)}>
          <option value="YEARLY">Theo năm</option><option value="MONTHLY">Theo tháng</option>
        </select>
      </label>
      <label htmlFor="service-term-evidence" className="block space-y-1 text-sm"><span>Mã hồ sơ/phụ lục ký *</span>
        <Input id="service-term-evidence" value={evidence} maxLength={500} onChange={e=>setEvidence(e.target.value)} placeholder="Mã hồ sơ để CHECKEE xác minh"/>
      </label>
      {invalid&&<p role="alert" className="text-sm text-destructive">{invalid}</p>}
      <AppButton disabled={busy} type="submit">Gửi Quản lý kiểm tra</AppButton>
    </form>}
    {actionable&&invalid&&<p role="alert" className="text-sm text-destructive">{invalid}</p>}
    {mode==='sales'&&<p className="text-xs text-muted-foreground">Hết chu kỳ bảo vệ 5 năm, Sales phải đăng ký tiếp cận lại bằng luồng đăng ký trường hiện có trước khi lập hợp đồng bảo vệ mới.</p>}
  </section>;
}
