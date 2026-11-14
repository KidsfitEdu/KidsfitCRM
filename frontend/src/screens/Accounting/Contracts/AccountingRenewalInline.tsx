'use client';

import {useEffect,useState} from 'react';
import {ChevronDown,ChevronUp,Download,Eye,FileText,Files,History,Paperclip} from 'lucide-react';
import {AppStatusBadge} from '@/components/common/app-status-badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {appNotice} from '@/components/common/app-toast-provider';
import {channelDate,channelMoney,channelRequest} from '@/lib/channel-operations';

type ContractPeriod={
  type:'ORIGINAL'|'RENEWAL';id:number;contract_id:number;contract_code:string;
  renewal_no:number|null;signed_on:string|null;service_start_on:string|null;
  service_end_on:string|null;payment_cycle:string|null;total_value:number;
  status:string;service_confirmed:boolean;
  evidence:{id:number;file_name:string;mime_type:string}|null;
};
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
  ACTIVE:'Đã xác minh',CONFIRMED:'Đã xác nhận',
  PENDING_ACCOUNTING:'Chờ Kế toán',NEEDS_INFO:'Cần bổ sung',
  REJECTED:'Đã từ chối',DRAFT:'Nháp'
};
const eventLabels:Record<string,string>={
  SUBMITTED:'Đã gửi hồ sơ',RESUBMITTED:'Đã gửi lại hồ sơ',
  CONFIRMED:'Kế toán đã xác nhận',NEEDS_INFO:'Kế toán yêu cầu bổ sung',
  REJECTED:'Kế toán đã từ chối',
};
const showDate=(value:string|null)=>value?channelDate(value):'Chưa cập nhật';
const paymentLabel=(cycle:string|null)=>cycle==='MONTHLY'?'Theo tháng':cycle==='YEARLY'?'Theo năm':'Chưa cập nhật';

/** Inline inside the existing Accounting contract drawer. No nested drawer or Sales endpoint. */
export function AccountingRenewalInline({apiBase,token,contractId,abilities,onChanged}:{
 apiBase:string;token:string;contractId:number;abilities:string[];
 onChanged:()=>Promise<void>;
}){
 const [periods,setPeriods]=useState<ContractPeriod[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [detail,setDetail]=useState<RenewalDetail|null>(null);
 const [decision,setDecision]=useState<Decision|null>(null);
 const [reason,setReason]=useState('');
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [detailLoading,setDetailLoading]=useState(false);
 const [fileBusy,setFileBusy]=useState<number|null>(null);
 const canReview=abilities.includes('channel_sales.renewal.review')||abilities.includes('*');
 const canConfirm=abilities.includes('channel_sales.renewal.confirm')||abilities.includes('*');
 const active=periods.find(p=>p.type+'-'+p.id===selected);
 const activeRenewal=active?.type==='RENEWAL'?active.id:null;

 useEffect(()=>{
   if(!canReview){setLoading(false);return;}
   let mounted=true;
   setLoading(true);setError('');setPeriods([]);setSelected(null);setDetail(null);
   void channelRequest<{data:ContractPeriod[]}>(apiBase,token,
     '/accounting/contracts/'+contractId+'/periods')
     .then(response=>{
       if(!mounted)return;
       setPeriods(response.data);
       const pending=response.data.find(p=>p.type==='RENEWAL'&&p.status==='PENDING_ACCOUNTING');
       const latest=response.data.at(-1);
       const chosen=pending??latest;
       setSelected(chosen?chosen.type+'-'+chosen.id:null);
     })
     .catch(e=>{if(mounted)setError(e instanceof Error?e.message:'Không tải được lịch sử hợp đồng.');})
     .finally(()=>{if(mounted)setLoading(false);});
   return()=>{mounted=false;};
 },[apiBase,token,contractId,canReview,revision]);

 useEffect(()=>{
   if(!activeRenewal||!canReview){setDetail(null);setDetailLoading(false);return;}
   let mounted=true;
   setDetail(null);setDecision(null);setDetailLoading(true);
   void channelRequest<RenewalDetail>(apiBase,token,'/accounting/renewals/'+activeRenewal)
     .then(data=>{if(mounted)setDetail(data);})
     .catch(e=>{if(mounted)appNotice.error('Không tải được hồ sơ tái ký.',e instanceof Error?e.message:'Thử lại sau.');})
     .finally(()=>{if(mounted)setDetailLoading(false);});
   return()=>{mounted=false;};
 },[apiBase,token,activeRenewal,canReview,revision]);

 const accessEvidence=async(evidence:{id:number;file_name:string;mime_type?:string},mode:'view'|'download')=>{
   const tab=mode==='view'?window.open('','_blank'):null;
   if(mode==='view'&&!tab){appNotice.error('Trình duyệt đang chặn cửa sổ xem chứng từ.');return;}
   if(tab){tab.opener=null;tab.document.title='Đang mở chứng từ...';}
   setFileBusy(evidence.id);
   try{
     const response=await fetch(apiBase+'/channel-sales/evidence/'+evidence.id,{
       headers:{Authorization:'Bearer '+token},cache:'no-store'});
     if(!response.ok)throw Error('Không có quyền xem chứng từ.');
     const data=await response.blob();
     const ext=evidence.file_name.split('.').pop()?.toLowerCase();
     const mime=evidence.mime_type||(
       ext==='pdf'?'application/pdf':ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg');
     const url=URL.createObjectURL(new Blob([data],{type:mime}));
     if(mode==='view'){
       if(!tab||tab.closed){URL.revokeObjectURL(url);throw Error('Tab xem chứng từ đã đóng.');}
       tab.location.replace(url);
       window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
     }else{
       const link=document.createElement('a');
       link.href=url;link.download=evidence.file_name;
       document.body.appendChild(link);link.click();link.remove();
       setTimeout(()=>URL.revokeObjectURL(url),1500);
     }
   }catch(e){if(tab&&!tab.closed)tab.close();appNotice.error('Không thể mở chứng từ.',e instanceof Error?e.message:'Thử lại sau.');}
   finally{setFileBusy(null);}
 };
 const process=async()=>{
   if(!activeRenewal||!detail||!decision||busy||detail.data.status!=='PENDING_ACCOUNTING'||!canReview)return;
   if(decision!=='request-info'&&!canConfirm)return;
   if(decision!=='confirm'&&!reason.trim()){appNotice.error('Vui lòng nhập lý do.');return;}
   setBusy(true);
   try{
     await channelRequest(apiBase,token,'/accounting/renewals/'+activeRenewal+'/'+decision,{
       method:'POST',...(decision==='confirm'?{}:{body:JSON.stringify({reason:reason.trim()})})
     });
     appNotice.success('Đã xử lý hồ sơ tái ký.');
     setRevision(v=>v+1);setDecision(null);setReason('');
     await onChanged();
   }catch(e){appNotice.error('Không thể xử lý hồ sơ tái ký.',e instanceof Error?e.message:'Vui lòng thử lại.');}
   finally{setBusy(false);}
 };

 return <section aria-label="Hợp đồng và lịch sử tái ký"
   className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-2">
     <h3 className="flex items-center gap-2 font-bold"><Files className="size-4 text-primary" aria-hidden="true"/> Hợp đồng & lịch sử tái ký</h3>
     {!loading&&!error&&<span className="text-xs text-muted-foreground">{periods.length} hồ sơ</span>}
   </div>
   <p className="text-xs leading-relaxed text-muted-foreground">Mở từng kỳ để xem thời hạn, giá trị, file hợp đồng và kết quả xác nhận.</p>
   {!canReview?<p className="text-sm text-muted-foreground">Tài khoản không có quyền xem hồ sơ tái ký.</p>
   :loading?<output className="block text-sm text-muted-foreground">Đang tải lịch sử hợp đồng...</output>
   :error?<p role="alert" className="text-sm text-destructive">{error}</p>
   :periods.length===0?<p className="text-sm text-muted-foreground">Chưa có hợp đồng trong phạm vi tài khoản.</p>
   :<div className="space-y-2">{periods.map(period=>{
     const key=period.type+'-'+period.id;
     const expanded=key===selected;
     return <div key={key} className="overflow-hidden rounded-xl border border-border">
       <button type="button" aria-expanded={expanded} aria-controls={'accounting-period-'+key}
         onClick={()=>{setSelected(expanded?null:key);setDecision(null);}}
         className="flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
         <FileText className="size-5 shrink-0 text-primary" aria-hidden="true"/>
         <span className="min-w-0 flex-1">
           <span className="block font-semibold">{period.type==='ORIGINAL'?'Hợp đồng gốc':'Tái ký lần '+period.renewal_no}</span>
           <span className="mt-1 block text-xs text-muted-foreground">{showDate(period.service_start_on)} – {showDate(period.service_end_on)}</span>
         </span>
         <AppStatusBadge status={period.status} label={labels[period.status]??period.status}/>
         {expanded?<ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>:
           <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>}
       </button>
       {expanded&&<div id={'accounting-period-'+key} className="space-y-3 border-t border-border px-3 py-4 text-sm">
         <p className="break-all text-xs text-muted-foreground">Mã hợp đồng: {period.contract_code}</p>
         <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
           <div><dt className="text-xs text-muted-foreground">Kỳ sử dụng</dt>
             <dd className="mt-1 font-medium">{showDate(period.service_start_on)} – {showDate(period.service_end_on)}</dd></div>
           <div><dt className="text-xs text-muted-foreground">Giá trị hợp đồng</dt>
             <dd className="mt-1 font-semibold tabular-nums">{channelMoney(period.total_value)}</dd></div>
           <div><dt className="text-xs text-muted-foreground">Ngày ký</dt>
             <dd className="mt-1 font-medium">{showDate(period.signed_on)}</dd></div>
           <div><dt className="text-xs text-muted-foreground">Thanh toán</dt>
             <dd className="mt-1 font-medium">{paymentLabel(period.payment_cycle)}</dd></div>
         </dl>
         {!period.service_confirmed&&<p className="text-xs text-amber-700 dark:text-amber-300">Kỳ tái ký chưa được Kế toán xác nhận; chưa tính là kỳ dịch vụ đã xác nhận.</p>}
         {period.type==='RENEWAL'&&detail?.data.id===period.id&&<>
           {detail.data.gap_reason&&<p className="rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Lý do gián đoạn: {detail.data.gap_reason}</p>}
           {detail.data.decision_reason&&<p className="whitespace-pre-wrap break-words">Lý do xử lý: {detail.data.decision_reason}</p>}
         </>}
         <div className="space-y-2 border-t border-border pt-3">
           <h4 className="flex items-center gap-2 font-semibold"><Paperclip className="size-4" aria-hidden="true"/> Chứng từ {period.type==='ORIGINAL'?'hợp đồng gốc':'tái ký'}</h4>
           {period.evidence?<div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
             <FileText className="size-5 shrink-0 text-primary" aria-hidden="true"/>
             <span className="min-w-0 flex-1 truncate font-medium" title={period.evidence.file_name}>{period.evidence.file_name}</span>
             <Button type="button" size="icon" variant="ghost" title="Xem chứng từ"
               aria-label={'Xem '+period.evidence.file_name} disabled={fileBusy!==null}
               onClick={()=>void accessEvidence(period.evidence!,'view')}><Eye className="size-4" aria-hidden="true"/></Button>
             <Button type="button" size="icon" variant="ghost" title="Tải chứng từ"
               aria-label={'Tải '+period.evidence.file_name} disabled={fileBusy!==null}
               onClick={()=>void accessEvidence(period.evidence!,'download')}><Download className="size-4" aria-hidden="true"/></Button>
           </div>:<p className="text-xs text-muted-foreground">Chưa có chứng từ đính kèm.</p>}
         </div>
         {period.type==='RENEWAL'&&<div className="space-y-2 border-t border-border pt-3">
           <h4 className="flex items-center gap-2 font-semibold"><History className="size-4" aria-hidden="true"/> Lịch sử xử lý</h4>
           {detailLoading?<output className="block text-xs text-muted-foreground">Đang tải lịch sử xử lý...</output>
            :detail?.data.id===period.id?(detail.events.length?detail.events.map((event,i)=>
              <div key={i} className="border-l-2 border-border pl-3 text-xs">
                <p className="font-medium">{eventLabels[event.event_type]??'Sự kiện hồ sơ'} · {event.actor_name}</p>
                <p className="mt-1 text-muted-foreground">{channelDate(event.created_at)}</p>
                {event.reason&&<p className="mt-1 whitespace-pre-wrap break-words">{event.reason}</p>}
              </div>):<p className="text-xs text-muted-foreground">Chưa có sự kiện xử lý.</p>)
            :<p className="text-xs text-muted-foreground">Chưa tải được lịch sử xử lý.</p>}
         </div>}
         {period.type==='RENEWAL'&&period.status==='PENDING_ACCOUNTING'&&canReview&&detail?.data.id===period.id&&<div className="space-y-3 border-t border-border pt-3">
           <h4 className="font-semibold">Kế toán xử lý</h4>
           <div className="flex flex-wrap gap-2">
             <Button type="button" disabled={!canConfirm||busy} onClick={()=>{setDecision('confirm');setReason('');}}>Xác nhận tái ký</Button>
             <Button type="button" disabled={busy} variant="outline" onClick={()=>{setDecision('request-info');setReason('');}}>Yêu cầu bổ sung</Button>
             <Button type="button" disabled={!canConfirm||busy} variant="destructive" onClick={()=>{setDecision('reject');setReason('');}}>Từ chối</Button>
           </div>
           {decision&&<div className="space-y-2 rounded-lg border border-border p-3">
             <p className="font-medium">Xác nhận thao tác {decision==='confirm'?'duyệt tái ký':decision==='request-info'?'yêu cầu bổ sung':'từ chối'}?</p>
             {decision!=='confirm'&&<div className="space-y-1">
               <label htmlFor="accounting-renewal-decision-reason" className="block font-medium">Lý do *</label>
               <Input id="accounting-renewal-decision-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000}/>
             </div>}
             <p className="text-xs text-muted-foreground">Kế toán chỉ xác nhận kỳ sử dụng. CRM tự kiểm tra quyền bảo vệ Sales khi đến mốc 5 năm.</p>
             <div className="flex flex-wrap gap-2">
               <Button type="button" disabled={busy} onClick={()=>void process()}>{busy?'Đang xử lý…':'Đồng ý'}</Button>
               <Button type="button" variant="outline" disabled={busy} onClick={()=>setDecision(null)}>Hủy</Button>
             </div>
           </div>}
         </div>}
       </div>}
     </div>;
   })}</div>}
 </section>;
}
