'use client';

import { useEffect, useState } from 'react';
import { Eye, RotateCcw, Search } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppPagination } from '@/components/common/app-pagination';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppButton } from '@/components/common/buttons/app-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

type Row={id:number;contract_id:number;contract_code:string;school_name:string;owner_name:string;
 renewal_no:number;signed_on:string;service_start_on:string;service_end_on:string;
 payment_cycle:string;total_value:number;gap_reason:string|null;status:string;submitted_at:string|null};
type List={data:Row[];total:number;page:number;page_size:number};
type Period={start_on:string;end_on:string;payment_cycle:string;renewal_no:number|null;renewal_id:number|null;gap_reason:string|null};
type Detail={data:Row&{decision_reason:string|null;source_service_start_on:string|null;
 source_service_end_on:string|null;source_total_value:number};
 preceding_period:Period|null;current_period:Period|null;next_confirmed_period:Period|null;
 evidence:{id:number;file_name:string;uploaded_at:string}[];
 events:{event_type:string;actor_name:string;reason:string|null;created_at:string}[]};
const labels:Record<string,string>={PENDING_ACCOUNTING:'Chờ Kế toán',NEEDS_INFO:'Cần bổ sung',
 REJECTED:'Đã từ chối',CONFIRMED:'Đã xác nhận'};
const actionLabel:Record<string,string>={confirm:'Xác nhận',reject:'Từ chối','request-info':'Yêu cầu bổ sung'};

export function ContractRenewalAccountingPanel({apiBase,token,abilities}:{apiBase:string;token:string;abilities:string[]}) {
 const [rows,setRows]=useState<Row[]>([]);
 const [search,setSearch]=useState('');
 const [query,setQuery]=useState('');
 const [status,setStatus]=useState('ALL');
 const [page,setPage]=useState(1);
 const [pageSize,setPageSize]=useState(20);
 const [total,setTotal]=useState(0);
 const [loading, setLoading] = useState(true);
 const [listError, setListError] = useState(false);
 const [listRevision, setListRevision] = useState(0);
 const [selected,setSelected]=useState<number|null>(null);
 const [loadedDetail, setLoadedDetail] = useState<Detail | null>(null);
 const [detailError, setDetailError] = useState(false);
 const [detailRevision, setDetailRevision] = useState(0);
 const detail = loadedDetail?.data.id === selected ? loadedDetail : null;
 const [reason,setReason]=useState('');
 const [action,setAction]=useState<'confirm'|'reject'|'request-info'|null>(null);
 const [saving,setSaving]=useState(false);
 const canReview=abilities.includes('channel_sales.renewal.review')||abilities.includes('*');
 const canConfirm=abilities.includes('channel_sales.renewal.confirm')||abilities.includes('*');
 const connected = Boolean(apiBase && token);
 useEffect(() => {
   if (!connected || !canReview) return;
   let live = true;
   const args = new URLSearchParams({ page: String(page), page_size: String(pageSize), status });
   if (query) args.set('search', query);
   setLoading(true);
   setListError(false);
   void channelRequest<List>(apiBase, token, `/accounting/renewals?${args}`)
     .then(result => {
       if (!live) return;
       const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
       if (page > lastPage) {
         setPage(lastPage);
         return;
       }
       setRows(result.data);
       setTotal(result.total);
     })
     .catch(() => { if (live) setListError(true); })
     .finally(() => { if (live) setLoading(false); });
   return () => { live = false; };
 }, [apiBase, token, connected, canReview, page, pageSize, status, query, listRevision]);

 useEffect(() => {
   if (!connected || !canReview || selected === null) return;
   let live = true;
   void channelRequest<Detail>(apiBase, token, `/accounting/renewals/${selected}`)
     .then(result => { if (live) setLoadedDetail(result); })
     .catch(() => { if (live) setDetailError(true); });
   return () => { live = false; };
 }, [apiBase, token, connected, canReview, selected, detailRevision]);

 const selectRenewal = (id: number | null) => {
   setLoadedDetail(null);
   setDetailError(false);
   setAction(null);
   setReason('');
   setSelected(id);
 };

 const resetFilters = () => {
   setSearch('');
   setQuery('');
   setStatus('ALL');
   setPage(1);
 };

 const process = async () => {
   if (!detail || !action || saving || !canReview || detail.data.status !== 'PENDING_ACCOUNTING') return;
   if (action !== 'request-info' && !canConfirm) return;
   if(action!=='confirm'&&!reason.trim()){appNotice.error('Cần nhập lý do xử lý hồ sơ.');return;}
   setSaving(true);
   try{
     await channelRequest(apiBase,token,`/accounting/renewals/${detail.data.id}/${action}`,{
       method:'POST',...(action==='confirm'?{}:{body:JSON.stringify({reason:reason.trim()})})
     });
     appNotice.success(action==='confirm'?'Đã xác nhận kỳ dịch vụ tái ký.':
       action==='reject'?'Đã từ chối hồ sơ tái ký.':'Đã yêu cầu Sales bổ sung.');
     setAction(null);
     setReason('');
     setLoadedDetail(null);
     setDetailRevision(value => value + 1);
     setListRevision(value => value + 1);
   }catch(e){appNotice.error('Không xử lý được hồ sơ.',e instanceof Error?e.message:'Vui lòng thử lại.');}
   finally{setSaving(false);}
 };
 const openProof=async(id:number,fileName:string)=>{
   const tab=window.open('','_blank');
   if(!tab){appNotice.error('Trình duyệt chặn cửa sổ xem hợp đồng.');return;}
   try{
     const response=await fetch(`${apiBase}/channel-sales/evidence/${id}`,{
       headers:{Authorization:`Bearer ${token}`},cache:'no-store'
     });
     if(!response.ok)throw new Error('Không có quyền xem chứng từ.');
     const bytes=await response.blob();
     const ext=fileName.split('.').pop()?.toLowerCase();
     const mime=ext==='pdf'?'application/pdf':ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';
     const uri=URL.createObjectURL(new Blob([bytes],{type:mime}));
     tab.location.replace(uri);
     window.addEventListener('pagehide',()=>URL.revokeObjectURL(uri),{once:true});
   }catch(e){tab.close();appNotice.error('Không mở được chứng từ.',e instanceof Error?e.message:'Vui lòng thử lại.');}
 };
 const hasFilters = Boolean(query || status !== 'ALL');

 if (!canReview || !connected) {
   return <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">
     {!canReview ? 'Tài khoản chưa có quyền xem hồ sơ tái ký.' : 'Cần đăng nhập để tải hồ sơ tái ký.'}
   </p>;
 }

 return <div className="min-w-0 space-y-5">
   <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card" aria-label="Danh sách hồ sơ tái ký">
     <form className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4 sm:px-5"
       onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}>
       <div className="relative min-w-0 basis-full sm:min-w-[190px] sm:flex-1">
         <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
         <Input aria-label="Tìm theo tên trường, mã hợp đồng hoặc Sales phụ trách"
           className="h-11 w-full rounded-xl pl-10" value={search} onChange={event => setSearch(event.target.value)}
           placeholder="Tên trường, mã hợp đồng, Sales phụ trách..."/>
       </div>
       <AppNativeSelect aria-label="Lọc theo trạng thái hồ sơ" value={status} containerClassName="w-full sm:w-60"
         onChange={event => { setStatus(event.target.value); setPage(1); }}>
         <option value="ALL">Tất cả trạng thái</option>
         {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
       </AppNativeSelect>
       <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
       <AppButton type="button" tone="outline" size="icon-lg" className="h-11 w-11 min-w-11 rounded-lg p-0"
         aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={resetFilters}>
         <RotateCcw className="size-4" aria-hidden="true"/>
       </AppButton>
     </form>
     <section className="overflow-x-auto" aria-label="Bảng hồ sơ tái ký" aria-busy={loading}>
       <table className="w-full min-w-[900px] text-left text-sm">
         <thead className="bg-[#1b5e20] text-xs font-bold uppercase tracking-[.04em] text-white">
           <tr>
             <th scope="col" className="px-5 py-3">Nhà trường / Hợp đồng gốc</th>
             <th scope="col" className="px-4 py-3">Sales phụ trách</th>
             <th scope="col" className="px-4 py-3">Kỳ tái ký</th>
             <th scope="col" className="px-4 py-3 text-right">Giá trị</th>
             <th scope="col" className="px-4 py-3">Trạng thái</th>
             <th scope="col" className="px-5 py-3 text-center">Thao tác</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-border/70">
           {!loading && !listError && rows.map(row => {
             const statusTone = row.status === 'CONFIRMED'
               ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
               : row.status === 'PENDING_ACCOUNTING'
                 ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
                 : 'border-border bg-muted/50 text-muted-foreground';
             return <tr key={row.id} className="transition-colors even:bg-muted/20 hover:bg-muted/40">
               <td className="px-5 py-4 align-middle">
                 <p className="font-semibold text-foreground">{row.school_name}</p>
                 <p className="mt-1 text-xs text-muted-foreground">{row.contract_code} · Lần {row.renewal_no}</p>
               </td>
               <td className="px-4 py-4 align-middle font-medium">{row.owner_name}</td>
               <td className="px-4 py-4 align-middle">{channelDate(row.service_start_on)} – {channelDate(row.service_end_on)}</td>
               <td className="px-4 py-4 text-right align-middle tabular-nums font-medium">{channelMoney(row.total_value)}</td>
               <td className="px-4 py-4 align-middle">
                 <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusTone}`}>{labels[row.status] ?? row.status}</span>
               </td>
               <td className="px-5 py-4 text-center align-middle">
                 <Button type="button" variant="outline" size="icon" onClick={() => selectRenewal(row.id)}
                   aria-label={`Xem hồ sơ tái ký lần ${row.renewal_no} của ${row.contract_code}`} title="Xem chi tiết hồ sơ">
                   <Eye className="size-4" aria-hidden="true"/>
                 </Button>
               </td>
             </tr>;
           })}
         </tbody>
       </table>
     </section>
     {loading ? <output className="block p-10 text-center text-sm text-muted-foreground">Đang tải hồ sơ tái ký...</output>
       : listError ? <div role="alert" className="space-y-2 p-8 text-center text-sm">
         <p>Không tải được danh sách hồ sơ tái ký.</p>
         <Button type="button" variant="outline" onClick={() => setListRevision(value => value + 1)}>Thử lại</Button>
       </div>
         : rows.length === 0 && <output className="block p-10 text-center text-sm text-muted-foreground">
           {hasFilters ? 'Không có hồ sơ phù hợp. Hãy thử bộ lọc khác.' : 'Chưa có hồ sơ tái ký.'}
         </output>}
     <AppPagination page={page} pageSize={pageSize} total={listError ? 0 : total} onPageChange={setPage}
       onPageSizeChange={size => { setPageSize(size); setPage(1); }} itemLabel="hồ sơ tái ký"
       showSummary={false} pageSizeOptions={[20, 50, 100]} disabled={loading || listError}/>
   </section>
   <AppDrawer wide compactAccountingHeader open={selected !== null}
     onOpenChange={open => { if (!open && !saving) selectRenewal(null); }}
     title="KIDSFIT CRM - CHI TIẾT TÁI KÝ" description="Chi tiết hồ sơ tái ký kế toán">
     {detailError ? <div role="alert" className="space-y-2 text-sm">
       <p>Không tải được chi tiết hồ sơ tái ký.</p>
       <Button type="button" variant="outline" onClick={() => {
         setDetailError(false);
         setDetailRevision(value => value + 1);
       }}>Thử lại</Button>
     </div> : !detail ? <output className="block text-sm text-muted-foreground">Đang tải chi tiết...</output>
       : <div className="space-y-6 text-sm">
         <div className="space-y-1">
           <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hồ sơ tái ký · Lần {detail.data.renewal_no}</p>
           <h2 className="text-xl font-bold">{detail.data.school_name}</h2>
         </div>
         <section className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
           <h3 className="font-semibold">Hợp đồng gốc</h3>
           <p>Mã hợp đồng: {detail.data.contract_code}</p>
           <p>Sales phụ trách: {detail.data.owner_name}</p>
           <p>Hạn dịch vụ gốc: {detail.data.source_service_end_on ? channelDate(detail.data.source_service_end_on) : 'Chưa cập nhật'}</p>
           <p><strong>Kỳ liền trước:</strong> {detail.preceding_period
             ? `${channelDate(detail.preceding_period.start_on)} – ${channelDate(detail.preceding_period.end_on)}`
             : 'Chưa xác định'}</p>
           {detail.current_period&&<p><strong>Kỳ đang sử dụng:</strong> {channelDate(detail.current_period.start_on)} – {channelDate(detail.current_period.end_on)}</p>}
           {detail.next_confirmed_period&&<p><strong>Kỳ tiếp theo đã xác nhận:</strong> {channelDate(detail.next_confirmed_period.start_on)} – {channelDate(detail.next_confirmed_period.end_on)}</p>}
           <p>Giá trị hợp đồng gốc: {channelMoney(detail.data.source_total_value)}</p>
         </section>
         <section className="space-y-2">
           <h3 className="font-semibold">Kỳ tái ký đề xuất</h3>
           <p>Ngày ký: {channelDate(detail.data.signed_on)}</p>
           <p>Kỳ mới: {channelDate(detail.data.service_start_on)} – {channelDate(detail.data.service_end_on)}</p>
           <p>Thanh toán: {detail.data.payment_cycle==='MONTHLY'?'Theo tháng':'Theo năm'}</p>
           <p>Giá trị: <strong>{channelMoney(detail.data.total_value)}</strong></p>
           <p>Trạng thái: <strong>{labels[detail.data.status]??detail.data.status}</strong></p>
           {detail.data.gap_reason&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><strong>Lý do gián đoạn:</strong> {detail.data.gap_reason}</p>}
           {detail.data.decision_reason&&<p>Lý do xử lý: {detail.data.decision_reason}</p>}
         </section>
         <section className="space-y-2 border-t pt-4">
           <h3 className="font-semibold">Chứng từ hợp đồng đã ký</h3>
           {detail.evidence.map(e=><Button key={e.id} type="button" variant="outline" onClick={()=>void openProof(e.id,e.file_name)}>
             Xem {e.file_name}</Button>)}
           {detail.evidence.length===0&&<p role="alert">Thiếu chứng từ hợp đồng.</p>}
         </section>
         <section className="space-y-2 border-t pt-4">
           <h3 className="font-semibold">Lịch sử xử lý</h3>
           {detail.events.map((e,i)=><p key={i}>{channelDate(e.created_at)} · {e.actor_name} · {e.event_type}{e.reason?` · ${e.reason}`:''}</p>)}
         </section>
         {detail.data.status==='PENDING_ACCOUNTING'&&<section className="space-y-3 border-t pt-4">
           <h3 className="font-semibold">Kế toán xử lý</h3>
           <div className="flex flex-wrap gap-2">
             <Button type="button" disabled={!canConfirm||saving} onClick={()=>{setAction('confirm');setReason('');}}>Xác nhận</Button>
             <Button type="button" variant="outline" disabled={saving} onClick={()=>{setAction('request-info');setReason('');}}>Yêu cầu bổ sung</Button>
             <Button type="button" variant="destructive" disabled={!canConfirm||saving} onClick={()=>{setAction('reject');setReason('');}}>Từ chối</Button>
           </div>
           {action&&<div className="rounded-lg border p-3 space-y-2">
             <p className="font-medium">{actionLabel[action]} hồ sơ?</p>
             {action!=='confirm'&&<label htmlFor="kc02-decision-reason" className="block space-y-1">Lý do *
               <Input id="kc02-decision-reason" value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000}/></label>}
             <p className="text-xs text-muted-foreground">Xác nhận chỉ tạo kỳ dịch vụ mới. Không ghi nhận thu tiền, hoa hồng hoặc gia hạn bảo vệ Sales.</p>
             <div className="flex gap-2"><Button type="button" disabled={saving} onClick={()=>void process()}>{saving?'Đang xử lý...':'Đồng ý'}</Button>
               <Button type="button" disabled={saving} variant="outline" onClick={()=>setAction(null)}>Hủy</Button></div>
           </div>}
         </section>}
       </div>}
   </AppDrawer>
 </div>;
}
