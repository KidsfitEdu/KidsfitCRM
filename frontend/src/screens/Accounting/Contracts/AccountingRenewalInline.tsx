'use client';

import {useEffect,useState} from 'react';
import {FileCheck2,History,Paperclip} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {appNotice} from '@/components/common/app-toast-provider';
import {channelDate,channelMoney,channelRequest} from '@/lib/channel-operations';

type Renewal={id:number;renewal_no:number;status:string;signed_on:string;service_start_on:string;
 service_end_on:string;payment_cycle:string;total_value:number;submitted_at:string|null};
type Period={start_on:string;end_on:string;payment_cycle:string;renewal_no:number|null;renewal_id:number|null;gap_reason:string|null};
type RenewalDetail={data:Renewal&{school_name:string;contract_code:string;owner_name:string;
  decision_reason:string|null;gap_reason:string|null;source_service_end_on:string|null};
  preceding_period:Period|null;current_period:Period|null;next_confirmed_period:Period|null;
  protection:{effective_until:string}|null;
  protection_case:{status:string;new_protection_from:string|null;new_protection_until:string|null}|null;
  evidence:{id:number;file_name:string;uploaded_at:string}[];
  events:{event_type:string;actor_name:string;reason:string|null;created_at:string}[]};
type Decision='confirm'|'reject'|'request-info';

const labels:Record<string,string>={
  PENDING_ACCOUNTING:'Chờ Kế toán xác nhận',NEEDS_INFO:'Yêu cầu bổ sung',
  REJECTED:'Đã từ chối',CONFIRMED:'Đã xác nhận',DRAFT:'Nháp'
};

/** Inline in the parent contract Drawer. Reuses KC-02 decision APIs; never another Drawer. */
export function AccountingRenewalInline({apiBase,token,contractId,abilities,onChanged}:{
 apiBase:string;token:string;contractId:number;abilities:string[];
 onChanged:()=>Promise<void>;
}){
 const [rows,setRows]=useState<Renewal[]>([]);
 const [selected,setSelected]=useState<number|null>(null);
 const [detail,setDetail]=useState<RenewalDetail|null>(null);
 const [decision,setDecision]=useState<Decision|null>(null);
 const [reason,setReason]=useState('');
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const canReview=abilities.includes('channel_sales.renewal.review')||abilities.includes('*');
 const canConfirm=abilities.includes('channel_sales.renewal.confirm')||abilities.includes('*');

 useEffect(()=>{
   if(!canReview){setLoading(false);return;}
   let active=true;setLoading(true);setRows([]);setSelected(null);setDetail(null);
   void channelRequest<{data:Renewal[]}>(apiBase,token,
       '/accounting/contracts/'+contractId+'/renewals')
     .then(response=>{if(active){setRows(response.data);setSelected(
       response.data.find(r=>r.status==='PENDING_ACCOUNTING')?.id??null);}})
     .catch(e=>{if(active)appNotice.error('Không tải được các kỳ tái ký.',e instanceof Error?e.message:'Thử lại sau.');})
     .finally(()=>{if(active)setLoading(false);});
   return ()=>{active=false;};
 },[apiBase,token,contractId,canReview,revision]);

 useEffect(()=>{
   if(!selected||!canReview){setDetail(null);return;}
   let active=true;setDetail(null);setDecision(null);
   void channelRequest<RenewalDetail>(apiBase,token,'/accounting/renewals/'+selected)
     .then(v=>{if(active)setDetail(v);})
     .catch(e=>{if(active)appNotice.error('Không tải được hồ sơ tái ký.',e instanceof Error?e.message:'Thử lại sau.');});
   return ()=>{active=false;};
 },[apiBase,token,selected,canReview,revision]);

 const openEvidence=async(evidence:{id:number;file_name:string})=>{
   const tab=window.open('','_blank');
   if(!tab){appNotice.error('Trình duyệt đang chặn cửa sổ xem hợp đồng.');return;}
   try{
     const res=await fetch(apiBase+'/channel-sales/evidence/'+evidence.id,{
       headers:{Authorization:'Bearer '+token},cache:'no-store'});
     if(!res.ok)throw Error('Không có quyền xem chứng từ.');
     const original=await res.blob();
     const ext=evidence.file_name.split('.').pop()?.toLowerCase();
     const mime=ext==='pdf'?'application/pdf':ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';
     const url=URL.createObjectURL(new Blob([original],{type:mime}));
     tab.location.replace(url);
     window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
   }catch(e){tab.close();appNotice.error('Không mở được chứng từ.',e instanceof Error?e.message:'Thử lại sau.');}
 };
 const process=async()=>{
   if(!selected||!detail||!decision||busy||detail.data.status!=='PENDING_ACCOUNTING'||!canReview) return;
   if(decision!=='request-info'&&!canConfirm)return;
   if(decision!=='confirm'&&!reason.trim()){appNotice.error('Vui lòng nhập lý do.');return;}
   setBusy(true);
   try{
     await channelRequest(apiBase,token,'/accounting/renewals/'+selected+'/'+decision,{
       method:'POST',...(decision==='confirm'?{}:{body:JSON.stringify({reason:reason.trim()})})
     });
     appNotice.success('Đã xử lý hồ sơ tái ký.');
     setRevision(v=>v+1);setDecision(null);setReason('');
     await onChanged();
   }catch(e){appNotice.error('Không thể xử lý hồ sơ tái ký.',e instanceof Error?e.message:'Vui lòng thử lại.');}
   finally{setBusy(false);}
 };

 return <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
   aria-label="Kỳ sử dụng và hồ sơ tái ký">
   <div className="flex flex-wrap items-center justify-between gap-2">
     <h3 className="flex items-center gap-2 text-base font-bold"><FileCheck2 className="size-4"/> Kỳ sử dụng & hồ sơ tái ký</h3>
     {rows.some(r=>r.status==='PENDING_ACCOUNTING')&&<span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">Có hồ sơ chờ xác nhận</span>}
   </div>
   {!canReview?<p className="text-sm text-muted-foreground">Tài khoản không có quyền xem hồ sơ tái ký.</p>
   :loading?<p className="text-muted-foreground">Đang tải kỳ tái ký…</p>
   :rows.length===0?<p className="text-muted-foreground">Chưa phát sinh hồ sơ tái ký.</p>:
   <div className="space-y-2">
     {rows.map(r=><button type="button" key={r.id} onClick={()=>setSelected(r.id)}
       className={'flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-3 text-left text-sm hover:bg-muted/40 '+
         (selected===r.id?'border-green-700 bg-green-50/60 dark:bg-green-950/20':'border-border')}>
       <span><strong>Tái ký lần {r.renewal_no}</strong><span className="block text-xs text-muted-foreground">
         {channelDate(r.service_start_on)} – {channelDate(r.service_end_on)}</span></span>
       <span className="text-xs font-medium">{labels[r.status]??r.status}</span>
     </button>)}
   </div>}
   {selected&&detail&&<div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3">
     <div className="grid gap-3 sm:grid-cols-2">
       <div><p className="text-xs text-muted-foreground">Kỳ tái ký đề nghị</p>
         <p className="font-medium">{channelDate(detail.data.service_start_on)} – {channelDate(detail.data.service_end_on)}</p></div>
       <div><p className="text-xs text-muted-foreground">Giá trị kỳ tái ký</p>
         <p className="font-medium tabular-nums">{channelMoney(detail.data.total_value)}</p></div>
       <div><p className="text-xs text-muted-foreground">Ngày ký</p><p>{channelDate(detail.data.signed_on)}</p></div>
       <div><p className="text-xs text-muted-foreground">Thanh toán</p>
         <p>{detail.data.payment_cycle==='MONTHLY'?'Theo tháng':'Theo năm'}</p></div>
     </div>
     {detail.data.gap_reason&&<p className="rounded-lg bg-amber-50 p-2 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Lý do gián đoạn: {detail.data.gap_reason}</p>}
     {detail.data.decision_reason&&<p>Lý do xử lý: {detail.data.decision_reason}</p>}
     <div className="space-y-2 border-t border-border pt-3">
       <h4 className="flex items-center gap-2 font-semibold"><Paperclip className="size-4"/> Chứng từ tái ký</h4>
       {detail.evidence.map(e=><Button key={e.id} type="button" size="sm" variant="outline"
         onClick={()=>void openEvidence(e)}>Xem {e.file_name}</Button>)}
       {detail.evidence.length===0&&<p role="alert" className="text-destructive">Chưa có chứng từ tái ký.</p>}
     </div>
     <div className="space-y-2 border-t border-border pt-3">
       <h4 className="flex items-center gap-2 font-semibold"><History className="size-4"/> Lịch sử xử lý</h4>
       {detail.events.map((e,i)=><p className="text-xs text-muted-foreground" key={i}>
         {channelDate(e.created_at)} · {e.actor_name} · {e.event_type}{e.reason?' · '+e.reason:''}</p>)}
       {detail.events.length===0&&<p className="text-xs text-muted-foreground">Chưa có sự kiện xử lý.</p>}
     </div>
     {detail.data.status==='PENDING_ACCOUNTING'&&canReview&&<div className="space-y-3 border-t border-border pt-3">
       <h4 className="font-semibold">Kế toán xử lý</h4>
       <div className="flex flex-wrap gap-2">
         <Button type="button" disabled={!canConfirm||busy} onClick={()=>{setDecision('confirm');setReason('');}}>Xác nhận tái ký</Button>
         <Button type="button" disabled={busy} variant="outline" onClick={()=>{setDecision('request-info');setReason('');}}>Yêu cầu bổ sung</Button>
         <Button type="button" disabled={!canConfirm||busy} variant="destructive" onClick={()=>{setDecision('reject');setReason('');}}>Từ chối</Button>
       </div>
       {decision&&<div className="space-y-2 rounded-lg border p-3">
         <p className="font-medium">Xác nhận thao tác {decision==='confirm'?'duyệt tái ký':decision==='request-info'?'yêu cầu bổ sung':'từ chối'}?</p>
         {decision!=='confirm'&&<div className="space-y-1 text-sm">
           <label htmlFor="accounting-renewal-decision-reason" className="block font-medium">Lý do *</label>
           <Input id="accounting-renewal-decision-reason" value={reason}
             onChange={e=>setReason(e.target.value)} maxLength={1000}/>
         </div>}
         <p className="text-xs text-muted-foreground">Kế toán chỉ xác nhận kỳ sử dụng. CRM tự kiểm tra quyền bảo vệ Sales khi đến mốc 5 năm.</p>
         <div className="flex gap-2">
           <Button type="button" disabled={busy} onClick={()=>void process()}>{busy?'Đang xử lý…':'Đồng ý'}</Button>
           <Button type="button" variant="outline" disabled={busy} onClick={()=>setDecision(null)}>Hủy</Button>
         </div>
       </div>}
     </div>}
   </div>}
 </section>;
}
