'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppPagination } from '@/components/common/app-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

type Row={id:number;contract_id:number;contract_code:string;school_name:string;owner_name:string;
 renewal_no:number;signed_on:string;service_start_on:string;service_end_on:string;
 payment_cycle:string;total_value:number;status:string;submitted_at:string|null};
type List={data:Row[];total:number;page:number;page_size:number};
type Detail={data:Row&{decision_reason:string|null;source_service_start_on:string|null;
 source_service_end_on:string|null;source_total_value:number};
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
 const [loading,setLoading]=useState(false);
 const [selected,setSelected]=useState<number|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [reason,setReason]=useState('');
 const [action,setAction]=useState<'confirm'|'reject'|'request-info'|null>(null);
 const [saving,setSaving]=useState(false);
 const canReview=abilities.includes('channel_sales.renewal.review')||abilities.includes('*');
 const canConfirm=abilities.includes('channel_sales.renewal.confirm')||abilities.includes('*');
 const load=useCallback(async()=>{
   if(!apiBase||!token||!canReview)return;
   setLoading(true);
   try{
     const args=new URLSearchParams({page:String(page),page_size:String(pageSize),status});
     if(query)args.set('search',query);
     const result=await channelRequest<List>(apiBase,token,`/accounting/renewals?${args}`);
     setRows(result.data);setTotal(result.total);
   }catch(e){appNotice.error('Không tải được hồ sơ tái ký.',e instanceof Error?e.message:'Vui lòng thử lại.');}
   finally{setLoading(false);}
 },[apiBase,token,canReview,page,pageSize,status,query]);
 useEffect(()=>{void load();},[load]);
 const read=useCallback(async(id:number)=>{
   try{
     const data=await channelRequest<Detail>(apiBase,token,`/accounting/renewals/${id}`);
     setDetail(data);
   }catch(e){appNotice.error('Không tải được chi tiết tái ký.',e instanceof Error?e.message:'Vui lòng thử lại.');}
 },[apiBase,token]);
 useEffect(()=>{if(selected!==null)void read(selected);else setDetail(null);},[selected,read]);
 const process=async()=>{
   if(!selected||!action)return;
   if(action!=='confirm'&&!reason.trim()){appNotice.error('Cần nhập lý do xử lý hồ sơ.');return;}
   setSaving(true);
   try{
     await channelRequest(apiBase,token,`/accounting/renewals/${selected}/${action}`,{
       method:'POST',...(action==='confirm'?{}:{body:JSON.stringify({reason:reason.trim()})})
     });
     appNotice.success(action==='confirm'?'Đã xác nhận kỳ dịch vụ tái ký.':
       action==='reject'?'Đã từ chối hồ sơ tái ký.':'Đã yêu cầu Sales bổ sung.');
     setAction(null);setReason('');await read(selected);await load();
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
 return <div className="space-y-5">
   <AppPageHeader eyebrow="KẾ TOÁN / KIDSFIT CRM" title="Hồ sơ tái ký"
     description="Hồ sơ Sales gửi trực tiếp. Kế toán đối chiếu hợp đồng, kỳ dịch vụ, giá trị và chứng từ trước khi xác nhận."/>
   {!canReview?<p role="alert">Tài khoản chưa có quyền xem hồ sơ tái ký.</p>:<>
     <form className="flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();setQuery(search.trim());setPage(1);}}>
       <label className="space-y-1 text-sm">Tìm trường / hợp đồng / Sales
         <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên trường hoặc mã hợp đồng"/>
       </label>
       <label className="space-y-1 text-sm">Trạng thái
         <select value={status} className="block w-full rounded-lg border bg-background p-2" onChange={e=>{setStatus(e.target.value);setPage(1);}}>
           <option value="ALL">Tất cả</option><option value="PENDING_ACCOUNTING">Chờ Kế toán</option>
           <option value="NEEDS_INFO">Cần bổ sung</option><option value="CONFIRMED">Đã xác nhận</option>
           <option value="REJECTED">Đã từ chối</option>
         </select>
       </label>
       <Button type="submit">Tìm kiếm</Button>
       <Button type="button" variant="outline" onClick={()=>{setSearch('');setQuery('');setStatus('ALL');setPage(1);}}>Đặt lại bộ lọc</Button>
     </form>
     <div className="overflow-x-auto rounded-xl border">
       <table className="w-full min-w-[970px] text-left text-sm">
         <thead className="bg-[#1b5e20] text-xs uppercase text-white"><tr>
           <th className="px-4 py-3">Nhà trường / Hợp đồng gốc</th>
           <th className="px-4 py-3">Sales phụ trách</th>
           <th className="px-4 py-3">Kỳ tái ký</th>
           <th className="px-4 py-3 text-right">Giá trị</th>
           <th className="px-4 py-3">Trạng thái</th>
           <th className="px-4 py-3">Thao tác</th>
         </tr></thead>
         <tbody>{rows.map(row=><tr key={row.id} className="border-t">
           <td className="px-4 py-3"><p className="font-semibold">{row.school_name}</p>
             <p className="text-xs text-muted-foreground">{row.contract_code} · Lần {row.renewal_no}</p></td>
           <td className="px-4 py-3">{row.owner_name}</td>
           <td className="px-4 py-3">{channelDate(row.service_start_on)} – {channelDate(row.service_end_on)}</td>
           <td className="px-4 py-3 text-right tabular-nums">{channelMoney(row.total_value)}</td>
           <td className="px-4 py-3">{labels[row.status]??row.status}</td>
           <td className="px-4 py-3"><Button variant="outline" size="sm" type="button" onClick={()=>setSelected(row.id)}>Xem chi tiết</Button></td>
         </tr>)}</tbody>
       </table>
       {!loading&&!rows.length&&<p className="p-8 text-center text-sm text-muted-foreground">Không có hồ sơ phù hợp.</p>}
     </div>
     <AppPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage}
       onPageSizeChange={size=>{setPageSize(size);setPage(1);}} itemLabel="hồ sơ tái ký" disabled={loading}/>
     <AppDrawer open={selected!==null} onOpenChange={open=>{if(!open){setSelected(null);setAction(null);setReason('');}}}
       title="KẾ TOÁN - HỒ SƠ TÁI KÝ" description={detail?.data.school_name??'Xem hồ sơ tái ký'} wide>
       {!detail?<p className="text-sm">Đang tải chi tiết...</p>:<div className="space-y-5 text-sm">
         <div className="rounded-lg border p-3">
           <h3 className="font-semibold">{detail.data.school_name}</h3>
           <p className="text-muted-foreground">Hợp đồng gốc: {detail.data.contract_code} · Sales: {detail.data.owner_name}</p>
           <p>Hạn dịch vụ gốc: {detail.data.source_service_end_on?channelDate(detail.data.source_service_end_on):'Chưa cập nhật'}</p>
           <p>Giá trị hợp đồng gốc: {channelMoney(detail.data.source_total_value)}</p>
         </div>
         <section className="space-y-2">
           <h3 className="font-semibold">1. Thông tin tái ký lần {detail.data.renewal_no}</h3>
           <p>Ngày ký: {channelDate(detail.data.signed_on)}</p>
           <p>Kỳ mới: {channelDate(detail.data.service_start_on)} – {channelDate(detail.data.service_end_on)}</p>
           <p>Thanh toán: {detail.data.payment_cycle==='MONTHLY'?'Theo tháng':'Theo năm'}</p>
           <p>Giá trị: <strong>{channelMoney(detail.data.total_value)}</strong></p>
           <p>Trạng thái: <strong>{labels[detail.data.status]??detail.data.status}</strong></p>
           {detail.data.decision_reason&&<p>Lý do xử lý: {detail.data.decision_reason}</p>}
         </section>
         <section className="space-y-2 border-t pt-4">
           <h3 className="font-semibold">2. Chứng từ hợp đồng đã ký</h3>
           {detail.evidence.map(e=><Button key={e.id} type="button" variant="outline" onClick={()=>void openProof(e.id,e.file_name)}>
             Xem {e.file_name}</Button>)}
           {detail.evidence.length===0&&<p role="alert">Thiếu chứng từ hợp đồng.</p>}
         </section>
         <section className="space-y-2 border-t pt-4">
           <h3 className="font-semibold">3. Lịch sử xử lý</h3>
           {detail.events.map((e,i)=><p key={i}>{channelDate(e.created_at)} · {e.actor_name} · {e.event_type}{e.reason?` · ${e.reason}`:''}</p>)}
         </section>
         {detail.data.status==='PENDING_ACCOUNTING'&&<section className="space-y-3 border-t pt-4">
           <h3 className="font-semibold">4. Kế toán xử lý</h3>
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
   </>}
 </div>;
}
