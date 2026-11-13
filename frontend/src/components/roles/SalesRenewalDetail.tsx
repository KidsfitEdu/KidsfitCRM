'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardCheck, Download, Eye, FileText, Paperclip } from 'lucide-react';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppStatusBadge } from '@/components/common/app-status-badge';
import { Button } from '@/components/ui/button';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

type Evidence = {id:number;file_name:string;mime_type:string;uploaded_at:string};
type RenewalDetail = {
  id:number;contract_id:number;contract_code:string;school_name:string;
  renewal_no:number;signed_on:string;service_start_on:string;service_end_on:string;
  payment_cycle:string;total_value:number;status:string;gap_reason:string|null;
  decision_reason:string|null;submitted_at:string|null;reviewed_at:string|null;
};
const statuses:Record<string,string>={
  PENDING_ACCOUNTING:'Đang chờ Kế toán', NEEDS_INFO:'Cần bổ sung',
  CONFIRMED:'Đã xác nhận', REJECTED:'Đã từ chối',
};

function DetailField({label,value}:{label:string;value:string}) {
  return <div className="min-w-0 space-y-1">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-semibold text-foreground">{value}</dd>
  </div>;
}

export function SalesRenewalDetail({id,apiBase,token,onResubmit,canResubmit}:{
  id:number;apiBase:string;token:string;onResubmit:()=>void;canResubmit:boolean;
}) {
  const [detail,setDetail]=useState<RenewalDetail|null>(null);
  const [files,setFiles]=useState<Evidence[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [fileBusy,setFileBusy]=useState<number|null>(null);

  useEffect(()=>{
    let active=true;
    void channelRequest<{data:RenewalDetail;evidence:Evidence[]}>(apiBase,token,
      '/renewals/mine/'+id)
      .then(res=>{if(active){setDetail(res.data);setFiles(res.evidence);setError('');}})
      .catch(reason=>{if(active){setDetail(null);setFiles([]);setError(
        reason instanceof Error?reason.message:'Không tải được chi tiết hồ sơ tái ký.');}})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[apiBase,token,id]);

  async function accessFile(file:Evidence,mode:'view'|'download') {
    // Create the new tab synchronously from the user's click, before auth fetch.
    const tab=mode==='view'?window.open('','_blank'):null;
    if(mode==='view'&&!tab){
      appNotice.error('Không mở được tab xem hợp đồng.',
        'Trình duyệt đang chặn popup. Vui lòng cho phép cửa sổ mới và thử lại.');
      return;
    }
    if(tab){tab.opener=null;tab.document.title='Đang mở hợp đồng...';}
    setFileBusy(file.id);
    try {
      const response=await fetch(apiBase+'/channel-sales/evidence/'+file.id,{
        headers:{Authorization:'Bearer '+token},cache:'no-store',
      });
      if(!response.ok)throw new Error('Không có quyền truy cập hoặc file không còn tồn tại.');
      const raw=await response.blob();
      const url=URL.createObjectURL(new Blob([raw],{type:file.mime_type}));
      if(mode==='view'){
        if(!tab||tab.closed){
          URL.revokeObjectURL(url);throw new Error('Tab đã đóng. Vui lòng thử lại.');
        }
        tab.location.replace(url);
        window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
      }else{
        const link=document.createElement('a');
        link.href=url;link.download=file.file_name;
        document.body.appendChild(link);link.click();link.remove();
        setTimeout(()=>URL.revokeObjectURL(url),1500);
      }
    }catch(reason){
      if(tab&&!tab.closed)tab.close();
      appNotice.error(mode==='view'?'Không xem được hợp đồng.':'Không tải được hợp đồng.',
        reason instanceof Error?reason.message:'Vui lòng thử lại.');
    }finally{setFileBusy(null);}
  }

  if(loading)return <output className="block p-5 text-sm text-muted-foreground">Đang tải thông tin hồ sơ tái ký...</output>;
  if(error)return <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>;
  if(!detail)return <p className="text-sm text-muted-foreground">Không tìm thấy hồ sơ.</p>;

  return <div className="space-y-4 text-sm">
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-snug">{detail.school_name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">Hồ sơ tái ký lần {detail.renewal_no}</p>
        </div>
        <AppStatusBadge status={detail.status} label={statuses[detail.status]??detail.status}/>
      </div>
      <p className="break-all text-xs text-muted-foreground">Hợp đồng gốc: {detail.contract_code}</p>
    </div>

    <section className="space-y-4 rounded-2xl border border-border bg-card p-4" aria-label="Thông tin hợp đồng tái ký">
      <h3 className="flex items-center gap-2 font-bold"><CalendarDays aria-hidden="true" className="size-4 text-primary"/>Thông tin hợp đồng tái ký</h3>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-4">
        <DetailField label="Ngày ký" value={channelDate(detail.signed_on)}/>
        <DetailField label="Chu kỳ thanh toán" value={detail.payment_cycle==='MONTHLY'?'Theo tháng':'Theo năm'}/>
        <DetailField label="Bắt đầu dịch vụ" value={channelDate(detail.service_start_on)}/>
        <DetailField label="Kết thúc dịch vụ" value={channelDate(detail.service_end_on)}/>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-muted-foreground">Giá trị tái ký</span>
        <strong className="text-base tabular-nums">{channelMoney(detail.total_value)}</strong>
      </div>
      {detail.gap_reason&&<div className="border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">Lý do gián đoạn giữa hai kỳ</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{detail.gap_reason}</p>
      </div>}
    </section>

    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-label="Hợp đồng đính kèm">
      <h3 className="flex items-center gap-2 font-bold"><Paperclip aria-hidden="true" className="size-4 text-primary"/>Hợp đồng đính kèm</h3>
      {files.length===0?<p className="text-sm text-muted-foreground">Chưa có hợp đồng đính kèm.</p>:
        <div className="space-y-2">{files.map(file=><div key={file.id}
          className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
          <FileText aria-hidden="true" className="size-5 shrink-0 text-primary"/>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium" title={file.file_name}>{file.file_name}</p>
            <p className="text-xs text-muted-foreground">Hợp đồng đã đính kèm</p>
          </div>
          <Button type="button" variant="ghost" size="icon" title="Xem file"
            aria-label={'Xem file '+file.file_name} disabled={fileBusy!==null}
            onClick={()=>void accessFile(file,'view')}><Eye className="size-4"/></Button>
          <Button type="button" variant="ghost" size="icon" title="Tải xuống"
            aria-label={'Tải xuống '+file.file_name} disabled={fileBusy!==null}
            onClick={()=>void accessFile(file,'download')}><Download className="size-4"/></Button>
        </div>)}</div>}
    </section>

    <section className="space-y-3 rounded-2xl border border-border bg-card p-4" aria-label="Tình trạng xử lý">
      <h3 className="flex items-center gap-2 font-bold"><ClipboardCheck aria-hidden="true" className="size-4 text-primary"/>Tình trạng xử lý</h3>
      <dl className="grid grid-cols-2 gap-3">
        <DetailField label="Ngày gửi hồ sơ" value={detail.submitted_at?channelDate(detail.submitted_at):'Chưa cập nhật'}/>
        <DetailField label="Kết quả Kế toán" value={statuses[detail.status]??detail.status}/>
        {detail.reviewed_at&&<DetailField label="Ngày xử lý" value={channelDate(detail.reviewed_at)}/>}
      </dl>
      {detail.decision_reason?<div className="rounded-xl border border-amber-300/40 bg-amber-50/70 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="text-xs font-semibold">Phản hồi Kế toán</p>
        <p className="mt-1 whitespace-pre-wrap break-words">{detail.decision_reason}</p>
      </div>:<p className="text-xs text-muted-foreground">
        {detail.status==='PENDING_ACCOUNTING'?'Chưa có phản hồi từ Kế toán.':'Không có phản hồi bổ sung.'}
      </p>}
    </section>
    {detail.status==='NEEDS_INFO'&&<Button type="button" disabled={!canResubmit}
      onClick={onResubmit}>Bổ sung hồ sơ này</Button>}
  </div>;
}
