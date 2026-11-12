'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AdminListPanel, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { channelRequest } from '@/lib/channel-operations';
import type { ManagerPageProps } from '@/types/manager-pages';

type MemberSplit={userId:number;organizationId:number;name:string;ceilingPercent:number|null;
  salesPercent:number|null;managerPercent:number|null;source:string;hasInvalidOverride:boolean;effectiveFrom:string|null};
type Version={id:number;organizationId:number;salesUserId:number|null;managerUserId:number|null;
  salesPercent:number;managerPercent:number;ceilingPercent:number;effectiveFrom:string;reason:string;status:string};
type Workspace={data:MemberSplit[];history:Version[]};
const nextDate=()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toLocaleDateString('en-CA');};

export function ManagerCommissionPanel({apiBase,token,abilities}:ManagerPageProps){
 const allowed=abilities.includes('*')||abilities.includes('channel_sales.team.manage');
 const [data,setData]=useState<Workspace|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [search,setSearch]=useState('');
 const [page,setPage]=useState(1);
 const pageSize=20;
 const [selected,setSelected]=useState<MemberSplit|null>(null);
 const [sales,setSales]=useState('');
 const [manager,setManager]=useState('');
 const [date,setDate]=useState(nextDate);
 const [reason,setReason]=useState('');
 const load=useCallback(async()=>{
  if(!allowed||!apiBase||!token)return;
  setLoading(true);setError('');
  try{setData(await channelRequest<Workspace>(apiBase,token,'/commission-config/manager'));}
  catch(e){setError(e instanceof Error?e.message:'Không thể tải phân bổ hoa hồng.');}
  finally{setLoading(false);}
 },[allowed,apiBase,token]);
 useEffect(()=>{void load();},[load]);
 const open=(person:MemberSplit)=>{
  setSelected(person);setSales(String(person.salesPercent??25));setManager(String(person.managerPercent??5));
  setReason('');setDate(nextDate());setError('');
 };
 const save=async()=>{
  if(!selected)return;
  setBusy(true);setError('');
  try{
   await channelRequest(apiBase,token,'/commission-config/manager',{method:'POST',body:JSON.stringify({
    organizationId:selected.organizationId,managerUserId:null,salesUserId:selected.userId,
    salesPercent:Number(sales),managerPercent:Number(manager),ceilingPercent:selected.ceilingPercent,
    effectiveFrom:date,reason
   })});
   setSelected(null);await load();
  }catch(e){setError(e instanceof Error?e.message:'Không lưu được phân bổ.');}
  finally{setBusy(false);}
 };
 const cancel=async(v:Version)=>{
  if(!window.confirm('Hủy phiên bản phân bổ chưa đến ngày hiệu lực?'))return;
  setBusy(true);setError('');
  try{await channelRequest(apiBase,token,'/commission-config/manager/'+v.id+'/cancel',{method:'POST'});
   await load();setSelected(null);
  }catch(e){setError(e instanceof Error?e.message:'Không thể hủy phân bổ.');}
  finally{setBusy(false);}
 };
 const visible=(data?.data??[]).filter(x=>x.name.toLowerCase().includes(search.toLowerCase()));
 const rows=visible.slice((page-1)*pageSize,page*pageSize);
 if(!allowed)return <p role="alert" className="rounded-xl border p-4 text-sm text-destructive">Không có quyền phân bổ hoa hồng.</p>;
 return <div className="space-y-4">
  <div><h2 className="text-lg font-semibold">Phân bổ hoa hồng Sales</h2>
   <p className="text-sm text-muted-foreground">Tỷ lệ do Quản lý phân bổ độc lập với hạn mức BGĐ. Chỉ cấu hình cho Sales trực thuộc.</p></div>
  {error&&<p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
  <input aria-label="Tìm Sales" className="w-full max-w-sm rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Tìm Sales trực thuộc..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
  <AdminListPanel><div className="overflow-x-auto"><table className={adminTableClass}>
   <thead className={adminTableHeadClass}><tr><th className="px-4 py-3">Sales</th>
    <th className="px-4 py-3 text-right">BGĐ cấp</th><th className="px-4 py-3 text-right">Sales (%)</th>
    <th className="px-4 py-3 text-right">Quản lý (%)</th><th className="px-4 py-3">Nguồn</th><th className="px-4 py-3 text-right">Thao tác</th>
   </tr></thead><tbody className="divide-y divide-border">{rows.map(x=><tr key={x.organizationId+'-'+x.userId}>
    <td className={adminTableCellClass+' font-medium'}>{x.name}</td>
    <td className={adminTableCellClass+' text-right tabular-nums'}>{x.ceilingPercent===null?'Chưa cấp':x.ceilingPercent+'%'}</td>
    <td className={adminTableCellClass+' text-right tabular-nums'}>{x.salesPercent===null?'—':x.salesPercent+'%'}</td>
    <td className={adminTableCellClass+' text-right tabular-nums'}>{x.managerPercent===null?'—':x.managerPercent+'%'}</td>
    <td className={adminTableCellClass+' text-xs'}>{x.hasInvalidOverride?'Vượt hạn mức — cần sửa':x.source==='MANAGER'?'Quản lý điều chỉnh':x.source==='DIRECTOR_DEFAULT'?'Kế thừa BGĐ':'Chưa cấu hình'}</td>
    <td className={adminTableCellClass+' text-right'}><button type="button" disabled={x.ceilingPercent===null}
     className="text-sm text-green-700 underline underline-offset-4 disabled:text-muted-foreground" onClick={()=>open(x)}>Điều chỉnh</button></td>
   </tr>)}</tbody></table></div>
   {loading&&<p className="p-6 text-center text-sm">Đang tải...</p>}
   {!loading&&!visible.length&&<p className="p-6 text-center text-sm text-muted-foreground">Không có Sales phù hợp.</p>}
  </AdminListPanel>
  <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
   <span className="text-muted-foreground">{visible.length} Sales · Trang {page}/{Math.max(1,Math.ceil(visible.length/pageSize))}</span>
   <AppButton tone="neutral" disabled={page<=1} onClick={()=>setPage(x=>Math.max(1,x-1))}>Trước</AppButton>
   <AppButton tone="neutral" disabled={page>=Math.ceil(visible.length/pageSize)} onClick={()=>setPage(x=>x+1)}>Sau</AppButton>
  </div>
  <AppDrawer open={!!selected} onOpenChange={open=>{if(!open&&!busy)setSelected(null)}} busy={busy}
   title={'Phân bổ hoa hồng — '+(selected?.name??'')} description="Tạo phiên bản mới theo hạn mức BGĐ"
   footer={<><AppButton tone="neutral" disabled={busy} onClick={()=>setSelected(null)}>Đóng</AppButton>
    <AppButton disabled={!selected||Number(sales)+Number(manager)>(selected?.ceilingPercent??0)} busy={busy} onClick={()=>void save()}>Lưu phiên bản</AppButton></>}>
   {selected&&<form onSubmit={e=>{e.preventDefault();void save()}} className="space-y-4 text-sm">
    <p className="rounded-lg bg-muted p-3">Hạn mức BGĐ: <b>{selected.ceilingPercent}%</b>. Cấu hình tại đây không sửa chính sách BGĐ.</p>
    <label className="block space-y-1"><span>Sales hưởng (%)</span>
     <input required type="number" min="0" max="100" step="0.0001" className="w-full rounded-lg border bg-background px-3 py-2" value={sales} onChange={e=>setSales(e.target.value)}/></label>
    <label className="block space-y-1"><span>Quản lý hưởng (%)</span>
     <input required type="number" min="0" max="100" step="0.0001" className="w-full rounded-lg border bg-background px-3 py-2" value={manager} onChange={e=>setManager(e.target.value)}/></label>
    <p className={Number(sales)+Number(manager)>(selected.ceilingPercent??0)?'text-destructive':'text-green-700'}>
     Tổng phân bổ: {Number(sales)+Number(manager)}% / {selected.ceilingPercent}%
    </p>
    <label className="block space-y-1"><span>Hiệu lực từ *</span><input type="date" required min={nextDate()} value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2"/></label>
    <label className="block space-y-1"><span>Lý do điều chỉnh *</span><textarea rows={3} required minLength={5} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2"/></label>
    <div className="border-t pt-3"><h3 className="font-semibold">Lịch sử phân bổ</h3>
     {(data?.history??[]).filter(h=>h.salesUserId===selected.userId&&h.organizationId===selected.organizationId).map(h=><p key={h.id} className="mt-2 text-xs text-muted-foreground">
      {h.effectiveFrom.slice(0,10)} · Sales {h.salesPercent}% / QL {h.managerPercent}% · {h.status} · {h.reason}
      {h.status==='ACTIVE'&&new Date(h.effectiveFrom)>new Date()&&
       <button type="button" disabled={busy} className="ml-2 text-destructive underline"
        aria-label={'Hủy phiên bản '+h.id} onClick={()=>void cancel(h)}>Hủy lịch hiệu lực</button>}
     </p>)}
     {!data?.history.some(h=>h.salesUserId===selected.userId&&h.organizationId===selected.organizationId)&&<p className="mt-2 text-xs text-muted-foreground">Chưa có điều chỉnh riêng.</p>}
    </div>
   </form>}
  </AppDrawer>
 </div>;
}
