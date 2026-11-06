'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, FileCheck2, FileText, Send, Undo2, ExternalLink } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { AppPagination } from '@/components/common/app-pagination';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelRequest, channelDate, channelMoney } from '@/lib/channel-operations';
import type { ManagerPageProps } from '@/types/manager-pages';

type Contract = { id:number;school_name:string;sales_name:string;contract_code:string;total_value:number;status:string;can_review:boolean;can_return:boolean };
type ListResponse = {data:Contract[];total:number;page:number;page_size:number};
type Detail = {
 data:{id:number;contract_code:string;school_name:string;school_address:string|null;school_province:string|null;
 sales_name:string;signed_on:string;total_value:number;status:string;service_plan:string|null;
 service_start_on:string|null;service_end_on:string|null;payment_cycle:string|null;student_count:number|null;
 evidence_reference:string|null;can_review:boolean;can_return:boolean;can_resubmit:boolean;reconciliation_status:string|null};
 evidence:{id:number;file_name:string;mime_type:string;created_at:string}[];
 installments:{due_on:string;amount:number;status:string}[];
 school_units:{id:number;name:string}[];
 history:{event_type:string;reason:string|null;created_at:string;actor_name:string}[];
 audit_history?:{action:string;old_values:string|null;new_values:string|null;created_at:string;actor_name:string|null}[];
};
const statuses:Record<string,string>={
 PENDING_REVIEW:'Chờ Quản lý',MANAGER_REVIEWED:'Chờ CHECKEE',NEEDS_REVISION:'Cần bổ sung',
 PENDING_KIDSFIT:'Chờ KIDSFIT',ACTIVE:'Đã xác minh',CANCELLED:'Đã hủy',DISPUTED:'CHECKEE yêu cầu bổ sung'
};
const canReview=(abilities:string[])=>abilities.includes('*')||abilities.includes('channel_sales.school.contract.review');

export function ContractsPage({apiBase,token,abilities,onChanged}:ManagerPageProps){
 const authorized=canReview(abilities);
 const connected=!!apiBase&&!!token&&authorized;
 const [rows,setRows]=useState<Contract[]>([]);
 const [total,setTotal]=useState(0);
 const [draft,setDraft]=useState('');
 const [search,setSearch]=useState('');
 const [status,setStatus]=useState('ALL');
 const [page,setPage]=useState(1);
 const [pageSize,setPageSize]=useState(20);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [selected,setSelected]=useState<number|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [detailError,setDetailError]=useState('');
 const [revision,setRevision]=useState<number|null>(null);
 const [reason,setReason]=useState('');
 const [confirm,setConfirm]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [actionError,setActionError]=useState('');
 const [revisionNo,setRevisionNo]=useState(0);
 const [filePreview,setFilePreview]=useState<{url:string;name:string;mime:string}|null>(null);
 const load=useCallback(async()=>{
   if(!connected)return;
   setLoading(true);setError('');
   try{
     const params=new URLSearchParams({page:String(page),page_size:String(pageSize),status});
     if(search.trim())params.set('search',search.trim());
     const result=await channelRequest<ListResponse>(apiBase,token,'/school-contracts/reviews?'+params);
     setRows(result.data);setTotal(result.total);
   }catch(e){setError(e instanceof Error?e.message:'Không tải được hợp đồng.');setRows([]);setTotal(0);}
   finally{setLoading(false);}
 },[apiBase,token,connected,page,pageSize,status,search]);
 useEffect(()=>{void load();},[load,revisionNo]);
 useEffect(()=>{
   if(!connected||selected===null){setDetail(null);return;}
   let active=true;setDetail(null);setDetailError('');
   void channelRequest<Detail>(apiBase,token,`/school-contracts/${selected}/review-detail`)
     .then(value=>{if(active)setDetail(value);})
     .catch(e=>{if(active)setDetailError(e instanceof Error?e.message:'Không tải được chi tiết.');});
   return()=>{active=false;};
 },[apiBase,token,connected,selected,revisionNo]);
 const refresh=async()=>{setRevisionNo(x=>x+1);await onChanged();};
 const command=async(id:number,path:string,body?:unknown)=>{
   if(busy)return;
   setBusy(true);setActionError('');
   try{
     await channelRequest(apiBase,token,`/school-contracts/${id}/${path}`,
       {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body??{})});
     setConfirm(null);setRevision(null);setReason('');await refresh();
   }catch(e){setActionError(e instanceof Error?e.message:'Không thực hiện được yêu cầu.');}
   finally{setBusy(false);}
 };
 const viewFile=async(file:{id:number;file_name:string;mime_type:string},inNewTab=true)=>{
   const tab=inNewTab?window.open('','_blank'):null;
   if(tab)tab.document.title='Đang mở hợp đồng...';
   try{
     const response=await fetch(`${apiBase}/channel-sales/evidence/${file.id}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
     if(!response.ok)throw new Error('Không có quyền xem file hoặc file không tồn tại.');
     const bytes=await response.blob();const url=URL.createObjectURL(new Blob([bytes],{type:file.mime_type}));
     if(inNewTab){
       if(!tab){URL.revokeObjectURL(url);throw new Error('Trình duyệt đang chặn tab mới.');}
       tab.location.replace(url);
       window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
     }else setFilePreview(previous=>{if(previous)URL.revokeObjectURL(previous.url);return {url,name:file.file_name,mime:file.mime_type};});
   }catch(e){tab?.close();setActionError(e instanceof Error?e.message:'Không mở được file.');}
 };
 if(!authorized)return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">Tài khoản không có quyền kiểm tra hợp đồng.</p>;
 return <div className="space-y-5">
   <AppPageHeader eyebrow="QUẢN LÝ BÁN HÀNG / HỢP ĐỒNG & XÁC MINH"
     title="Hợp đồng & xác minh"
     description="Rà soát hợp đồng do Sales báo cáo, chuyển CHECKEE xác minh và theo dõi phản hồi."/>
   {!connected&&<output className="block rounded-xl border p-4 text-sm text-muted-foreground">Chế độ xem thử: đăng nhập hệ thống để xem và duyệt hợp đồng thật.</output>}
   {error&&<p role="alert" className="rounded-xl border border-red-200 p-3 text-sm text-red-700">{error}</p>}
   <AdminListPanel>
     <AdminListToolbar search={draft} onSearchChange={setDraft}
       onSearch={()=>{setSearch(draft.trim());setPage(1);}}
       onReset={()=>{setDraft('');setSearch('');setStatus('ALL');setPage(1);}}
       searchLabel="Tìm hợp đồng theo trường, mã hợp đồng hoặc Sales"
       placeholder="Tên trường, mã hợp đồng, Sales..."
       filters={<AppNativeSelect aria-label="Lọc trạng thái hợp đồng" value={status} containerClassName="w-full sm:w-52"
          onChange={e=>{setStatus(e.target.value);setPage(1);}}>
         <option value="ALL">Tất cả trạng thái</option>
         {Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}
       </AppNativeSelect>}/>
     <div className="overflow-x-auto">
       <table className={adminTableClass}>
         <thead className={adminTableHeadClass}><tr>
           <th className="px-5 py-4">Trường học</th><th className="px-5 py-4">SALES</th>
           <th className="px-5 py-4">Mã hợp đồng</th><th className="px-5 py-4 text-right">Giá trị</th>
           <th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-center">Thao tác</th>
         </tr></thead>
         <tbody className="divide-y divide-border/70">
         {rows.map(row=><tr key={row.id} className="even:bg-muted/20 hover:bg-muted/40">
           <td className={adminTableCellClass}><span className="font-semibold">{row.school_name}</span></td>
           <td className={adminTableCellClass}>{row.sales_name}</td>
           <td className={adminTableCellClass}>{row.contract_code}</td>
           <td className={adminTableCellClass+' text-right tabular-nums'}>{channelMoney(row.total_value)}</td>
           <td className={adminTableCellClass}><AdminStatusBadge status={row.status} label={statuses[row.status]??row.status}/></td>
           <td className={adminTableCellClass}>
             <div className="flex items-center justify-center gap-2">
               <AdminIconAction icon={Eye} label={`Xem hợp đồng ${row.contract_code}`} onClick={()=>setSelected(row.id)}/>
               {row.can_review&&<AdminIconAction icon={FileCheck2} label={`Duyệt và gửi CHECKEE ${row.contract_code}`}
                 onClick={()=>{setActionError('');setConfirm(row.id);}}/>}
               {row.can_return&&<AdminIconAction icon={Undo2} tone="red" label={`Yêu cầu bổ sung ${row.contract_code}`}
                 onClick={()=>{setActionError('');setReason('');setRevision(row.id);}}/>}
             </div>
           </td>
         </tr>)}
         </tbody>
       </table>
     </div>
     {!loading&&!error&&!rows.length&&<p className="px-5 py-12 text-center text-sm text-muted-foreground">Chưa có hợp đồng phù hợp.</p>}
     {loading&&<p className="px-5 py-6 text-center text-sm text-muted-foreground">Đang tải dữ liệu...</p>}
     <AppPagination page={page} pageSize={pageSize} total={total} disabled={loading} showSummary={false}
       itemLabel="hợp đồng" pageSizeOptions={[20,50,100]} onPageChange={setPage}
       onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
   </AdminListPanel>
   <AppDrawer wide compactAccountingHeader open={selected!==null} onOpenChange={open=>{if(!open){setSelected(null);setFilePreview(null);}}}
     title="KIDSFIT CRM - CHI TIẾT HỢP ĐỒNG" description="Chi tiết hợp đồng Quản lý bán hàng"
     footer={<div className="flex flex-wrap justify-end gap-2">
       <AppButton tone="neutral" onClick={()=>setSelected(null)}>Đóng</AppButton>
       {detail?.data.can_return&&<AppButton tone="outline" leadingIcon={<Undo2 className="size-4"/>}
         onClick={()=>{setActionError('');setReason('');setRevision(detail.data.id);}}>Yêu cầu bổ sung</AppButton>}
       {detail?.data.can_review&&<AppButton leadingIcon={<Send className="size-4"/>}
         onClick={()=>{setActionError('');setConfirm(detail.data.id);}}>Duyệt & gửi CHECKEE</AppButton>}
     </div>}>
     {!detail?<p className="text-sm text-muted-foreground">{detailError||'Đang tải chi tiết hợp đồng...'}</p>:
       <div className="space-y-5 text-sm">
         <div><p className="text-xs font-semibold text-muted-foreground">Chi tiết hợp đồng · {detail.data.contract_code}</p>
           <h2 className="mt-1 text-xl font-bold">{detail.data.school_name}</h2>
           <p className="mt-2 text-muted-foreground">{[detail.data.school_address,detail.data.school_province].filter(Boolean).join(', ')}</p>
           <p className="mt-2">Sales phụ trách: <strong>{detail.data.sales_name}</strong></p>
           <AdminStatusBadge status={detail.data.reconciliation_status==="DISPUTED"?"DISPUTED":detail.data.status}
             label={statuses[detail.data.reconciliation_status==="DISPUTED"?"DISPUTED":detail.data.status]??detail.data.status}/>
         </div>
         <div className="grid gap-3 sm:grid-cols-2">
           {[["Mã hợp đồng",detail.data.contract_code],["Ngày ký",channelDate(detail.data.signed_on)],
             ["Giá trị",channelMoney(detail.data.total_value)],["Gói dịch vụ",detail.data.service_plan||'Chưa khai báo'],
             ["Bắt đầu dịch vụ",detail.data.service_start_on?channelDate(detail.data.service_start_on):'Chưa khai báo'],
             ["Kết thúc dịch vụ",detail.data.service_end_on?channelDate(detail.data.service_end_on):'Chưa khai báo'],
             ["Chu kỳ thanh toán",detail.data.payment_cycle==='YEARLY'?'Theo năm':detail.data.payment_cycle==='MONTHLY'?'Theo tháng':'Chưa khai báo'],
             ["Số học sinh",String(detail.data.student_count??'Chưa khai báo')]].map(([label,value])=>
             <div key={label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}
         </div>
         <section className="space-y-2 border-t pt-4"><h3 className="font-bold">File hợp đồng đã ký</h3>
           {detail.evidence.length?detail.evidence.map(file=><button key={file.id} type="button" title="Mở hợp đồng trong tab mới"
             className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted"
             onClick={()=>void viewFile(file)}>
             <span className="flex items-center gap-2"><FileText className="size-4"/>{file.file_name}</span>
             <ExternalLink className="size-4" aria-hidden="true"/>
           </button>):<p className="text-muted-foreground">Chưa có file đính kèm. {detail.data.evidence_reference??''}</p>}
         </section>
         <section className="space-y-2 border-t pt-4"><h3 className="font-bold">Trường điểm triển khai</h3>
           <p>{detail.school_units.length?detail.school_units.map(x=>x.name).join(', '):'Chỉ trường chính / chưa khai báo'}</p>
         </section>
         <section className="space-y-2 border-t pt-4"><h3 className="font-bold">Lịch thanh toán</h3>
           {detail.installments.map((item,i)=><div key={i} className="flex justify-between gap-3 border-b py-2">
             <span>{channelDate(item.due_on)}</span><span>{channelMoney(item.amount)}</span></div>)}
           {!detail.installments.length&&<p className="text-muted-foreground">Chưa khai báo lịch thanh toán.</p>}
         </section>
         {!!detail.audit_history?.length && <section className="space-y-2 border-t pt-4">
           <h3 className="font-bold">Lịch sử chỉnh sửa hợp đồng</h3>
           {detail.audit_history.map((entry,i)=><div key={i} className="border-l-2 border-amber-600 py-2 pl-3">
             <p className="font-medium">{({
               REQUEST_SCHOOL_CONTRACT_REVISION:'Quản lý yêu cầu bổ sung',
               EDIT_SCHOOL_CONTRACT_REVISION:'Sales chỉnh sửa hợp đồng',
               RESUBMIT_SCHOOL_CONTRACT:'Sales gửi lại Quản lý',
             } as Record<string,string>)[entry.action]??entry.action}</p>
             <p className="text-xs text-muted-foreground">{channelDate(entry.created_at)} · {entry.actor_name??'Hệ thống'}</p>
             {(entry.old_values||entry.new_values)&&<details className="mt-2 text-xs">
               <summary className="cursor-pointer text-primary">Xem dữ liệu thay đổi</summary>
               {entry.old_values&&<pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">Trước: {entry.old_values}</pre>}
               {entry.new_values&&<pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">Sau: {entry.new_values}</pre>}
             </details>}
           </div>)}
         </section>}
         <section className="space-y-2 border-t pt-4"><h3 className="font-bold">Lịch sử xử lý</h3>
           {detail.history.map((entry,i)=><div key={i} className="border-l-2 border-green-700 py-2 pl-3">
             <p className="font-medium">{entry.event_type} · {entry.actor_name}</p>
             <p className="text-xs text-muted-foreground">{channelDate(entry.created_at)}{entry.reason?' · '+entry.reason:''}</p>
           </div>)}
           {!detail.history.length&&<p className="text-muted-foreground">Chưa có lịch sử xử lý.</p>}
         </section>
       </div>}
   </AppDrawer>
   <ConfirmDialog open={confirm!==null} onOpenChange={open=>{if(!open&&!busy){setConfirm(null);setActionError('');}}}
     title="Xác nhận chuyển hợp đồng" confirmLabel="Xác nhận chuyển" busy={busy}
     description={<>Sau khi xác nhận, hợp đồng <strong>{rows.find(x=>x.id===confirm)?.contract_code??detail?.data.contract_code}</strong> sẽ được chuyển đến CHECKEE để kiểm tra và xác minh.</>}
     onConfirm={()=>{if(confirm!==null)void command(confirm,'review');}}>
     {actionError&&<p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
   </ConfirmDialog>
   <AppDialog open={revision!==null} onOpenChange={open=>{if(!open&&!busy){setRevision(null);setActionError('');}}}
     title="Yêu cầu Sales bổ sung" description="Nhập rõ nội dung cần chỉnh sửa trước khi trả hồ sơ."
     busy={busy} footer={<div className="flex gap-2"><AppButton tone="neutral" disabled={busy}
       onClick={()=>setRevision(null)}>Hủy</AppButton><AppButton busy={busy} disabled={!reason.trim()}
       onClick={()=>{if(revision!==null)void command(revision,'request-revision',{reason});}}>Gửi yêu cầu</AppButton></div>}>
     <label htmlFor="manager-contract-reason" className="text-sm font-semibold">Lý do / căn cứ yêu cầu bổ sung *</label>
     <textarea id="manager-contract-reason" className="mt-2 min-h-28 w-full rounded-lg border bg-background p-3 text-sm"
       value={reason} maxLength={2000} onChange={e=>setReason(e.target.value)} required/>
     {actionError&&<p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
   </AppDialog>
   {filePreview&&<AppDialog open={true} onOpenChange={()=>{URL.revokeObjectURL(filePreview.url);setFilePreview(null);}}
     title={filePreview.name}><iframe title={filePreview.name} src={filePreview.url} className="h-[60vh] w-full"/></AppDialog>}
 </div>;
}
