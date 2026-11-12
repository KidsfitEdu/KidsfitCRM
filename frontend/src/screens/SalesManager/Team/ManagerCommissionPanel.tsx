'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, Pencil, RotateCcw } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppPagination } from '@/components/common/app-pagination';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge,
  adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { Input } from '@/components/ui/input';
import { channelRequest } from '@/lib/channel-operations';
import type { ManagerPageProps } from '@/types/manager-pages';

type MemberSplit={
  userId:number;organizationId:number;name:string;
  ceilingPercent:number|null;managerCeilingPercent:number|null;
  salesPercent:number|null;managerPercent:number|null;
  source:string;hasInvalidOverride:boolean;effectiveFrom:string|null;
};
type Version={
  id:number;organizationId:number;salesUserId:number|null;managerUserId:number|null;
  salesPercent:number;managerPercent:number;ceilingPercent:number;createdAt:string;
  effectiveFrom:string;status:string;
};
type Workspace={data:MemberSplit[];history:Version[]};
const localDate=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});

export function ManagerCommissionPanel({apiBase,token,abilities}:ManagerPageProps){
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.team.manage');
  const [data,setData]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [selected,setSelected]=useState<MemberSplit|null>(null);
  const [detail,setDetail]=useState<MemberSplit|null>(null);
  const [cancelVersion,setCancelVersion]=useState<number|null>(null);
  const [sales,setSales]=useState('');
  const [manager,setManager]=useState('');
  const [validation,setValidation]=useState('');
  const load=useCallback(async()=>{
    if(!allowed||!apiBase||!token)return;
    setLoading(true);setError('');
    try{setData(await channelRequest<Workspace>(apiBase,token,'/commission-config/manager'));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được phân bổ hoa hồng.');}
    finally{setLoading(false);}
  },[allowed,apiBase,token]);
  useEffect(()=>{queueMicrotask(()=>void load());},[load]);
  const open=(person:MemberSplit)=>{
    setSelected(person);
    setSales(String(person.salesPercent??''));
    setManager(String(person.managerPercent??''));
    setValidation('');setError('');setNotice('');
  };
  const save=async()=>{
    if(!selected)return;
    const a=Number(sales),b=Number(manager);
    if(sales.trim()===''||manager.trim()===''||![a,b].every(x=>Number.isFinite(x)&&x>=0&&x<=100&&Math.round(x*10000)===x*10000)){
      setValidation('Nhập tỷ lệ 0–100% với tối đa 4 chữ số thập phân.');return;
    }
    if(a+b>(selected.ceilingPercent??0)||b>(selected.managerCeilingPercent??0)){
      setValidation('Phân bổ vượt hạn mức BGĐ cấp hoặc trần riêng Quản lý.');return;
    }
    setBusy(true);setValidation('');setError('');setNotice('');
    try{
      await channelRequest(apiBase,token,'/commission-config/manager',{method:'POST',body:JSON.stringify({
        organizationId:selected.organizationId,managerUserId:null,salesUserId:selected.userId,
        salesPercent:a,managerPercent:b,ceilingPercent:selected.ceilingPercent
      })});
      setSelected(null);setNotice('Đã lưu và áp dụng phân bổ mới.');await load();
    }catch(e){setValidation(e instanceof Error?e.message:'Không lưu được phân bổ.');}
    finally{setBusy(false);}
  };
  const reset=async()=>{
    if(cancelVersion===null)return;
    setBusy(true);setError('');setNotice('');
    try{
      await channelRequest(apiBase,token,'/commission-config/manager/'+cancelVersion+'/cancel',{method:'POST'});
      setCancelVersion(null);setDetail(null);setNotice('Đã khôi phục phân bổ kế thừa từ BGĐ.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Không khôi phục được phân bổ.');}
    finally{setBusy(false);}
  };
  const historyFor=(person:MemberSplit)=>(data?.history??[])
    .filter(x=>x.organizationId===person.organizationId&&x.salesUserId===person.userId)
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id-a.id);
  const visible=(data?.data??[]).filter(x=>x.name.toLowerCase().includes(search.toLowerCase()));
  const pageRows=visible.slice((page-1)*pageSize,page*pageSize);
  if(!allowed)return <p role="alert" className="rounded-xl border p-4 text-sm text-destructive">Không có quyền phân bổ hoa hồng.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="QUẢN LÝ BÁN HÀNG / KIDSFIT CRM" title="Phân bổ hoa hồng"
      description="Điều chỉnh tỷ lệ cho Sales trực thuộc trong hạn mức do BGĐ cấp. Lưu thành công áp dụng ngay."/>
    {notice&&<output className="block "rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">{notice}</output>}
    {error&&<p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setPage(1);}}
        placeholder="Tìm Sales trực thuộc..." searchLabel="Tìm Sales"/>
      <div className="overflow-x-auto"><table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr>
          <th className="px-5 py-4">Sales</th>
          <th className="px-5 py-4 text-right">Hạn mức BGĐ</th>
          <th className="px-5 py-4 text-right">Trần QL</th>
          <th className="px-5 py-4 text-right">Sales hưởng</th>
          <th className="px-5 py-4 text-right">QL hưởng</th>
          <th className="px-5 py-4">Nguồn phân bổ</th>
          <th className="px-5 py-4 text-right">Thao tác</th>
        </tr></thead>
        <tbody className="divide-y divide-border">
          {pageRows.map(x=><tr key={x.organizationId+'-'+x.userId} className="hover:bg-muted/30">
            <td className={adminTableCellClass+' font-semibold'}>{x.name}</td>
            <td className={adminTableCellClass+' text-right tabular-nums'}>{x.ceilingPercent===null?'—':x.ceilingPercent+'%'}</td>
            <td className={adminTableCellClass+' text-right tabular-nums'}>{x.managerCeilingPercent===null?'—':x.managerCeilingPercent+'%'}</td>
            <td className={adminTableCellClass+' text-right tabular-nums'}>{x.salesPercent===null?'—':x.salesPercent+'%'}</td>
            <td className={adminTableCellClass+' text-right tabular-nums'}>{x.managerPercent===null?'—':x.managerPercent+'%'}</td>
            <td className={adminTableCellClass}>
              <AdminStatusBadge status={x.hasInvalidOverride?'REJECTED':'ACTIVE'}
                label={x.hasInvalidOverride?'Phân bổ không hợp lệ':x.source==='MANAGER'?'Quản lý điều chỉnh':x.source==='DIRECTOR_DEFAULT'?'Kế thừa BGĐ':'Chưa cấu hình'}/>
            </td>
            <td className={adminTableCellClass}><div className="flex justify-end gap-2">
              <AdminIconAction icon={Eye} label={'Xem lịch sử phân bổ '+x.name} onClick={()=>setDetail(x)}/>
              <AdminIconAction icon={Pencil} tone="blue" label={'Điều chỉnh hoa hồng '+x.name}
                disabled={x.ceilingPercent===null} onClick={()=>open(x)}/>
              {x.source==='MANAGER'&&historyFor(x)[0]?.status==='ACTIVE'&&
                <AdminIconAction icon={RotateCcw} tone="red" label={'Khôi phục phân bổ '+x.name}
                  onClick={()=>setCancelVersion(historyFor(x)[0].id)}/>}
            </div></td>
          </tr>)}
        </tbody>
      </table>
      {!loading&&pageRows.length===0&&<p className="p-7 text-center text-sm text-muted-foreground">Không có Sales phù hợp.</p>}
      {loading&&<p className="p-7 text-center text-sm text-muted-foreground">Đang tải danh sách...</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={visible.length}
        onPageChange={setPage} pageSizeOptions={[10,20,50]} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDrawer open={detail!==null} onOpenChange={open=>{if(!open)setDetail(null)}}
      title="Lịch sử phân bổ" description="Các phiên bản của Sales được lưu tự động">
      {detail&&<div className="space-y-3">
        <h3 className="font-semibold">{detail.name}</h3>
        {historyFor(detail).map(x=><div key={x.id} className="rounded-xl border p-3 text-sm">
          <p className="font-medium">{x.salesPercent}% Sales / {x.managerPercent}% Quản lý</p>
          <p className="mt-1 text-muted-foreground">{localDate(x.createdAt)} · {x.status==='RESET'?'Khôi phục mặc định':'Cập nhật phân bổ'}</p>
        </div>)}
        {historyFor(detail).length===0&&<p className="text-sm text-muted-foreground">Chưa có lịch sử điều chỉnh riêng.</p>}
      </div>}
    </AppDrawer>
    <AppDialog open={selected!==null} onOpenChange={open=>{if(!open&&!busy)setSelected(null)}}
      busy={busy} title={'Điều chỉnh hoa hồng — '+(selected?.name??'')}
      description="Tỷ lệ mới áp dụng ngay sau khi lưu thành công. Hệ thống tự ghi nhật ký."
      footer={<><AppButton tone="neutral" disabled={busy} onClick={()=>setSelected(null)}>Hủy</AppButton>
        <AppButton busy={busy} onClick={()=>void save()}>Lưu &amp; áp dụng</AppButton></>}>
      {selected&&<div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-sm">
          <div><p className="text-muted-foreground">Tổng hạn mức BGĐ</p><p className="font-semibold">{selected.ceilingPercent}%</p></div>
          <div><p className="text-muted-foreground">Trần Quản lý</p><p className="font-semibold">{selected.managerCeilingPercent}%</p></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><label htmlFor="split-sales" className="text-sm font-medium">Sales hưởng (%) *</label>
            <Input id="split-sales" type="number" min={0} max={100} step="0.0001" value={sales}
              disabled={busy} onChange={e=>setSales(e.target.value)}/></div>
          <div className="space-y-1.5"><label htmlFor="split-manager" className="text-sm font-medium">Quản lý hưởng (%) *</label>
            <Input id="split-manager" type="number" min={0} max={100} step="0.0001" value={manager}
              disabled={busy} onChange={e=>setManager(e.target.value)}/></div>
        </div>
        <p className="rounded-lg bg-muted/40 p-3 text-sm">Tổng phân bổ: <strong>{Number(sales)+Number(manager)}%</strong>
          {' '} / Hạn mức {selected.ceilingPercent}%</p>
        {validation&&<p role="alert" className="text-sm text-destructive">{validation}</p>}
      </div>}
    </AppDialog>
    <ConfirmDialog open={cancelVersion!==null} onOpenChange={open=>{if(!open&&!busy)setCancelVersion(null)}}
      busy={busy} title="Khôi phục phân bổ kế thừa"
      description="Hệ thống ngừng dùng cấu hình riêng hiện tại và áp dụng lại phân bổ mặc định của BGĐ. Lịch sử cũ vẫn được lưu."
      confirmLabel="Khôi phục" onConfirm={()=>void reset()}/>
  </div>;
}
