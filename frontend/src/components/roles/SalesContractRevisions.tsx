'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { AlertCircle, FileUp, SquarePen } from 'lucide-react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelRequest } from '@/lib/channel-operations';

type Revision = {id:number;contract_code:string;school_name:string;reason:string|null};
type RevisionList = {data:Revision[];total:number};
type Props = {apiBase:string;token:string;abilities:string[];onChanged:()=>Promise<void>};

/** Returned contracts remain visible to their Sales owner until a replacement file is submitted. */
export function SalesContractRevisions({apiBase,token,abilities,onChanged}:Props){
 const [rows,setRows]=useState<Revision[]>([]);
 const [error,setError]=useState('');
 const [actionError,setActionError]=useState('');
 const [selected,setSelected]=useState<Revision|null>(null);
 const [busy,setBusy]=useState(false);
 const [version,setVersion]=useState(0);
 const enabled=!!apiBase&&!!token&&(abilities.includes('*')||abilities.includes('channel_sales.contract.report'));
 const load=useCallback(async()=>{
  if(!enabled)return;
  try{
   const data=await channelRequest<RevisionList>(apiBase,token,'/school-contracts/my-revisions');
   setRows(data.data);setError('');
  }catch(e){setError(e instanceof Error?e.message:'Không thể tải hợp đồng cần bổ sung.');}
 },[apiBase,token,enabled]);
 useEffect(()=>{void load();},[load,version]);
 if(!enabled)return null;
 const submit=async(event:SyntheticEvent<HTMLFormElement>)=>{
  event.preventDefault();
  if(!selected||busy)return;
  const form=new FormData(event.currentTarget);
  const file=form.get('contract_file');
  if(!(file instanceof File)||!file.size){setActionError('Chọn file hợp đồng bổ sung.');return;}
  setBusy(true);setActionError('');
  try{
    const upload=new FormData();upload.set('kind','CONTRACT');upload.set('file',file);
    const proof=await channelRequest<{data:{id:number}}>(apiBase,token,'/evidence',{method:'POST',body:upload});
    await channelRequest(apiBase,token,`/school-contracts/${selected.id}/resubmit`,{method:'POST',
      body:JSON.stringify({evidence_id:proof.data.id})});
    setSelected(null);setVersion(x=>x+1);await onChanged();
  }catch(e){setActionError(e instanceof Error?e.message:'Không thể gửi lại hồ sơ.');}
  finally{setBusy(false);}
 };
 return <>
   {error&&<p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-700">{error}</p>}
   {rows.length>0&&<section aria-label="Hợp đồng cần bổ sung" className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
    <header className="flex items-center gap-2 border-b border-amber-200 p-4">
      <AlertCircle className="size-5 text-amber-700" aria-hidden="true"/>
      <h3 className="font-semibold text-amber-900 dark:text-amber-200">Hợp đồng cần bổ sung ({rows.length})</h3>
    </header>
    <div className="divide-y divide-amber-200/60">
    {rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-sm">{row.school_name} · {row.contract_code}</p>
        <p className="mt-1 text-xs text-muted-foreground">{row.reason??'Quản lý yêu cầu kiểm tra và bổ sung chứng từ.'}</p>
      </div>
      <AppButton type="button" tone="outline" leadingIcon={<SquarePen className="size-4"/>}
        onClick={()=>{setSelected(row);setActionError('');}}>Bổ sung file</AppButton>
    </div>)}
    </div>
   </section>}
   <AppDialog open={selected!==null} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}}
      title="Gửi lại hợp đồng" description={selected?`${selected.school_name} · ${selected.contract_code}`:''}
      busy={busy}>
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">Yêu cầu từ Quản lý: {selected?.reason??'Bổ sung tài liệu hợp đồng.'}</p>
      <label className="block text-sm font-semibold" htmlFor="replacement-contract">File hợp đồng đã bổ sung *</label>
      <input id="replacement-contract" name="contract_file" type="file" accept=".pdf,image/jpeg,image/png,image/webp" required
        className="block w-full rounded-lg border border-border bg-background p-3 text-sm"/>
      <p className="text-xs text-muted-foreground">PDF/JPG/PNG/WEBP tối đa 5 MB. File cũ và lịch sử duyệt vẫn được giữ lại.</p>
      {actionError&&<p role="alert" className="text-sm text-red-700">{actionError}</p>}
      <div className="flex flex-wrap justify-end gap-2">
       <AppButton tone="neutral" type="button" disabled={busy} onClick={()=>setSelected(null)}>Hủy</AppButton>
       <AppButton type="submit" busy={busy} leadingIcon={<FileUp className="size-4"/>}>Gửi lại Quản lý</AppButton>
      </div>
    </form>
   </AppDialog>
 </>;
}
