'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, XCircle } from 'lucide-react';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AdminListPanel, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { channelRequest } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

type Version = {
  id:number; organizationId:number; managerUserId:number|null; salesUserId:number|null;
  scope:string; configuredBy:string; ceilingPercent:number; salesPercent:number; managerPercent:number;
  effectiveFrom:string; status:string; reason:string; createdByUserId:number; createdAt:string;
};
type Member={userId:number;organizationId:number;managerUserId:number|null;name:string};
type Workspace={data:Version[];organizations:{id:number;name:string;code:string}[];members:Member[]};
type Props=Pick<RolePageProps,'apiBase'|'token'|'abilities'>;
type Editor={organizationId:number;managerUserId:string;salesUserId:string;salesPercent:string;managerPercent:string;ceilingPercent:string;effectiveFrom:string;reason:string};
const initial:Editor={organizationId:0,managerUserId:'',salesUserId:'',salesPercent:'25',managerPercent:'5',ceilingPercent:'30',effectiveFrom:'',reason:''};
const dateOnly=(iso:string)=>iso?.slice(0,10)??'';
const today=()=>{const d=new Date();d.setDate(d.getDate()+1);return d.toLocaleDateString('en-CA');};

export function BoardCommissionPoliciesPanel({apiBase,token,abilities}:Props){
  const authorized=abilities.includes('*')||abilities.includes('channel_sales.policy.manage');
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [search,setSearch]=useState('');
  const [organization,setOrganization]=useState('ALL');
  const [scope,setScope]=useState('ALL');
  const [editor,setEditor]=useState<Editor|null>(null);
  const [selected,setSelected]=useState<Version|null>(null);
  const load=useCallback(async()=>{
    if(!apiBase||!token||!authorized)return;
    setLoading(true);setError('');
    try{setWorkspace(await channelRequest<Workspace>(apiBase,token,'/commission-config/board'));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được chính sách hoa hồng.');}
    finally{setLoading(false);}
  },[apiBase,token,authorized]);
  useEffect(()=>{void load();},[load]);
  const orgName=(id:number)=>workspace?.organizations.find(o=>o.id===id)?.name??String(id);
  const person=(id:number|null)=>id?workspace?.members.find(m=>m.userId===id)?.name??String(id):'—';
  const managers=useMemo(()=>{
    const ids=new Set((workspace?.members??[]).filter(m=>m.organizationId===editor?.organizationId&&m.managerUserId!==null).map(m=>m.managerUserId!));
    return (workspace?.members??[]).filter(m=>m.organizationId===editor?.organizationId&&ids.has(m.userId));
  },[workspace,editor?.organizationId]);
  const visible=(workspace?.data??[]).filter(v=>(organization==='ALL'||String(v.organizationId)===organization)
    &&(scope==='ALL'||v.scope===scope)
    &&[orgName(v.organizationId),person(v.managerUserId),person(v.salesUserId),v.reason].some(x=>x.toLowerCase().includes(search.toLowerCase())));
  const start=(v?:Version)=>{
    setSelected(null);setError('');
    setEditor(v?{organizationId:v.organizationId,managerUserId:v.managerUserId?.toString()??'',
      salesUserId:v.salesUserId?.toString()??'',salesPercent:String(v.salesPercent),managerPercent:String(v.managerPercent),
      ceilingPercent:String(v.ceilingPercent),effectiveFrom:today(),reason:''}
      :{...initial,organizationId:workspace?.organizations[0]?.id??0,effectiveFrom:today()});
  };
  const save=async()=>{
    if(!editor)return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/commission-config/board',{method:'POST',body:JSON.stringify({
        organizationId:editor.organizationId,managerUserId:editor.managerUserId?Number(editor.managerUserId):null,
        salesUserId:editor.salesUserId?Number(editor.salesUserId):null,
        salesPercent:Number(editor.salesPercent),managerPercent:Number(editor.managerPercent),
        ceilingPercent:Number(editor.ceilingPercent),effectiveFrom:editor.effectiveFrom,reason:editor.reason,
      })});
      setEditor(null);await load();
    }catch(e){setError(e instanceof Error?e.message:'Không lưu được cấu hình.');}
    finally{setBusy(false);}
  };
  const cancel=async(v:Version)=>{
    if(!window.confirm('Hủy phiên bản chưa tới ngày hiệu lực? Nhật ký vẫn được lưu.'))return;
    setBusy(true);setError('');
    try{await channelRequest(apiBase,token,'/commission-config/board/'+v.id+'/cancel',{method:'POST'});setSelected(null);await load();}
    catch(e){setError(e instanceof Error?e.message:'Không hủy được phiên bản.');}
    finally{setBusy(false);}
  };
  if(!authorized)return <p role="alert" className="rounded-xl border p-4 text-destructive">Không có quyền cấu hình chính sách hoa hồng.</p>;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Chính sách & hạn mức BGĐ</h2>
        <p className="text-sm text-muted-foreground">Thiết lập giới hạn và tỷ lệ mặc định. Quản lý phân bổ riêng, không sửa chính sách này.</p></div>
      <AppButton leadingIcon={<Plus className="size-4"/>} onClick={()=>start()} disabled={loading||!workspace}>Thêm cấu hình</AppButton>
    </div>
    <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
      Nếu chưa có cấu hình, hệ thống không tự bật tính hoa hồng. Đề xuất mặc định: Sales 25% + Quản lý 5% = 30%; cần lưu phiên bản có ngày hiệu lực.
    </div>
    {error&&<p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
    <div className="grid gap-2 sm:grid-cols-3">
      <input aria-label="Tìm kiếm chính sách" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tổ chức, Quản lý, Sales..." className="rounded-lg border bg-background px-3 py-2 text-sm"/>
      <select aria-label="Lọc tổ chức" value={organization} onChange={e=>setOrganization(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="ALL">Tất cả tổ chức</option>{workspace?.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select aria-label="Lọc phạm vi" value={scope} onChange={e=>setScope(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
        <option value="ALL">Tất cả phạm vi</option><option value="ORGANIZATION">Tổ chức</option><option value="MANAGER">Quản lý</option><option value="SALES">Sales</option>
      </select>
    </div>
    <AdminListPanel><div className="overflow-x-auto"><table className={adminTableClass}>
      <thead className={adminTableHeadClass}><tr>
        <th className="px-4 py-3">Phạm vi</th><th className="px-4 py-3">Tổ chức</th>
        <th className="px-4 py-3 text-right">Sales</th><th className="px-4 py-3 text-right">Quản lý</th>
        <th className="px-4 py-3 text-right">Hạn mức</th><th className="px-4 py-3">Hiệu lực</th>
        <th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">CRUD</th>
      </tr></thead><tbody className="divide-y divide-border">
      {visible.map(v=><tr key={v.id} className="hover:bg-muted/30">
        <td className={adminTableCellClass}><p className="font-medium">{v.scope==='ORGANIZATION'?'Mặc định tổ chức':v.scope==='MANAGER'?person(v.managerUserId):person(v.salesUserId)}</p>
          {v.scope==='SALES'&&<p className="text-xs text-muted-foreground">QL: {person(v.managerUserId)}</p>}</td>
        <td className={adminTableCellClass}>{orgName(v.organizationId)}</td>
        <td className={adminTableCellClass+' text-right tabular-nums'}>{v.salesPercent}%</td>
        <td className={adminTableCellClass+' text-right tabular-nums'}>{v.managerPercent}%</td>
        <td className={adminTableCellClass+' text-right font-semibold tabular-nums'}>{v.ceilingPercent}%</td>
        <td className={adminTableCellClass}>{dateOnly(v.effectiveFrom)}</td>
        <td className={adminTableCellClass}>{v.status==='ACTIVE'?'Đã cấu hình':'Đã hủy'}</td>
        <td className={adminTableCellClass+' text-right'}><div className="flex justify-end gap-2">
          <button type="button" onClick={()=>setSelected(v)} className="text-sm underline underline-offset-4">Xem</button>
          <button type="button" onClick={()=>start(v)} className="text-sm text-green-700 underline underline-offset-4">Sửa</button>
        </div></td>
      </tr>)}</tbody></table></div>
      {loading&&<p className="p-6 text-center text-sm">Đang tải...</p>}
      {!loading&&!visible.length&&<p className="p-6 text-center text-sm text-muted-foreground">Không có cấu hình phù hợp.</p>}
    </AdminListPanel>
    <AppDrawer open={!!selected} onOpenChange={open=>{if(!open)setSelected(null)}} title="Chi tiết phiên bản BGĐ" description="Lịch sử được giữ nguyên khi tạo phiên bản mới">
      {selected&&<div className="space-y-3 text-sm"><p><b>Đơn vị:</b> {orgName(selected.organizationId)}</p>
        <p><b>Quản lý:</b> {person(selected.managerUserId)}</p><p><b>Sales:</b> {person(selected.salesUserId)}</p>
        <p><b>Phân bổ mặc định:</b> {selected.salesPercent}% Sales + {selected.managerPercent}% Quản lý</p>
        <p><b>Hạn mức:</b> {selected.ceilingPercent}%</p><p><b>Ngày hiệu lực:</b> {dateOnly(selected.effectiveFrom)}</p>
        <p><b>Lý do:</b> {selected.reason}</p><p><b>Người tạo (ID):</b> {selected.createdByUserId}</p>
        {selected.status==='ACTIVE'&&new Date(selected.effectiveFrom)>new Date()&&
          <AppButton tone="danger" busy={busy} leadingIcon={<XCircle className="size-4"/>} onClick={()=>void cancel(selected)}>Hủy phiên bản tương lai</AppButton>}
      </div>}
    </AppDrawer>
    <AppDrawer open={!!editor} onOpenChange={open=>{if(!open&&!busy)setEditor(null)}} title="Cấu hình hạn mức hoa hồng" description="Tạo phiên bản mới, không thay đổi các phiên bản đã có" busy={busy}
      footer={<><AppButton tone="neutral" onClick={()=>setEditor(null)} disabled={busy}>Đóng</AppButton><AppButton busy={busy} onClick={()=>void save()}>Lưu phiên bản</AppButton></>}>
      {editor&&<form onSubmit={e=>{e.preventDefault();void save()}} className="space-y-4 text-sm">
        <label className="block space-y-1"><span>Đối tác / tổ chức *</span>
          <select className="w-full rounded-lg border bg-background px-3 py-2" value={editor.organizationId} onChange={e=>setEditor({...editor,organizationId:Number(e.target.value),managerUserId:'',salesUserId:''})}>
            {workspace?.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
          </select></label>
        <label className="block space-y-1"><span>Quản lý (để trống nếu mặc định tổ chức)</span>
          <select className="w-full rounded-lg border bg-background px-3 py-2" value={editor.managerUserId} onChange={e=>setEditor({...editor,managerUserId:e.target.value,salesUserId:''})}>
            <option value="">Toàn tổ chức</option>{managers.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select></label>
        {editor.managerUserId&&<label className="block space-y-1"><span>Sales (để trống nếu cấu hình cả nhóm)</span>
          <select className="w-full rounded-lg border bg-background px-3 py-2" value={editor.salesUserId} onChange={e=>setEditor({...editor,salesUserId:e.target.value})}>
            <option value="">Tất cả Sales trực thuộc</option>{workspace?.members.filter(m=>m.organizationId===editor.organizationId&&String(m.managerUserId)===editor.managerUserId).map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select></label>}
        <div className="grid grid-cols-2 gap-3">{(['salesPercent','managerPercent','ceilingPercent'] as const).map(k=><label key={k} className="block space-y-1">
          <span>{k==='salesPercent'?'Sales (%)':k==='managerPercent'?'Quản lý (%)':'Tổng hạn mức (%)'}</span>
          <input required type="number" min="0" max="100" step="0.0001" value={editor[k]} onChange={e=>setEditor({...editor,[k]:e.target.value})} className="w-full rounded-lg border bg-background px-3 py-2"/>
        </label>)}</div>
        <p className="text-xs text-muted-foreground">Tổng đang phân bổ: {Number(editor.salesPercent)+Number(editor.managerPercent)}% / hạn mức {editor.ceilingPercent}%.</p>
        <label className="block space-y-1"><span>Ngày hiệu lực *</span><input required type="date" min={today()} className="w-full rounded-lg border bg-background px-3 py-2" value={editor.effectiveFrom} onChange={e=>setEditor({...editor,effectiveFrom:e.target.value})}/></label>
        <label className="block space-y-1"><span>Lý do điều chỉnh *</span><textarea required minLength={5} maxLength={1000} className="w-full rounded-lg border bg-background px-3 py-2" rows={3} value={editor.reason} onChange={e=>setEditor({...editor,reason:e.target.value})}/></label>
        <p className="text-xs text-muted-foreground">Chính sách chỉ phục vụ cấu hình và kiểm tra hạn mức; chưa kích hoạt tính/chi trả hoa hồng.</p>
      </form>}
    </AppDrawer>
  </div>;
}
