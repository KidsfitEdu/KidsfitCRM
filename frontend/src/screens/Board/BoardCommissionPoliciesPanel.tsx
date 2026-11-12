'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, RotateCcw } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppSelect } from '@/components/common/app-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge,
  adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { BoardCommissionPolicyEditorDialog, type CommissionForm,
  type CommissionOrganization, type CommissionMember } from './BoardCommissionPolicyEditorDialog';
import { channelRequest } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

type Version={
  id:number;organizationId:number;managerUserId:number|null;salesUserId:number|null;
  scope:string;configuredBy:string;salesPercent:number;managerPercent:number;
  ceilingPercent:number;managerCeilingPercent:number|null;
  effectiveFrom:string;createdAt:string;createdByUserId:number;
  status:string;reason:string;
};
type Workspace={data:Version[];organizations:CommissionOrganization[];members:CommissionMember[]};
type Props=Pick<RolePageProps,'apiBase'|'token'|'abilities'>;
const dateTime=(value:string)=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
const scopeLabel=(scope:string)=>({SYSTEM:'Mặc định hệ thống',ORGANIZATION:'Tổ chức',MANAGER:'Quản lý',SALES:'Sales'}[scope]??scope);
const defaultForm=(organizations:CommissionOrganization[]):CommissionForm=>({
  applyScope:'SYSTEM',organizationId:organizations.find(x=>x.code==='KIDSFIT')?.id??0,
  managerUserId:'',salesUserId:'',salesPercent:'25',managerPercent:'5',
  ceilingPercent:'30',managerCeilingPercent:'30'
});

export function BoardCommissionPoliciesPanel({apiBase,token,abilities}:Props){
  const authorized=abilities.includes('*')||abilities.includes('channel_sales.policy.manage');
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [organization,setOrganization]=useState('ALL');
  const [scope,setScope]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [editor,setEditor]=useState<CommissionForm|null>(null);
  const [replacing,setReplacing]=useState(false);
  const [selected,setSelected]=useState<Version|null>(null);
  const [cancelId,setCancelId]=useState<number|null>(null);
  const load=useCallback(async()=>{
    if(!apiBase||!token||!authorized)return;
    setLoading(true);setError('');
    try{setWorkspace(await channelRequest<Workspace>(apiBase,token,'/commission-config/board'));}
    catch(e){setError(e instanceof Error?e.message:'Không thể tải cấu hình hoa hồng.');}
    finally{setLoading(false);}
  },[apiBase,token,authorized]);
  useEffect(()=>{queueMicrotask(()=>void load());},[load]);
  const orgName=(id:number)=>workspace?.organizations.find(o=>o.id===id)?.name??String(id);
  const person=(id:number|null)=>id?workspace?.members.find(m=>m.userId===id)?.name??String(id):'—';
  const visible=useMemo(()=>(workspace?.data??[])
    .filter(x=>(organization==='ALL'||String(x.organizationId)===organization)
      &&(scope==='ALL'||x.scope===scope)
      &&[orgName(x.organizationId),person(x.managerUserId),person(x.salesUserId),x.scope]
        .some(y=>y.toLowerCase().includes(search.toLowerCase()))),
    // Lookup arrays are changed only through workspace refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspace,organization,scope,search]);
  const pageRows=visible.slice((page-1)*pageSize,page*pageSize);
  const start=(v?:Version)=>{
    setSelected(null);setError('');setNotice('');setReplacing(Boolean(v));
    setEditor(v?{
      organizationId:v.organizationId,managerUserId:String(v.managerUserId??''),
      salesUserId:String(v.salesUserId??''),
      applyScope:v.scope==='SYSTEM'?'SYSTEM':'ORGANIZATION',
      salesPercent:String(v.salesPercent),managerPercent:String(v.managerPercent),
      ceilingPercent:String(v.ceilingPercent),managerCeilingPercent:String(v.managerCeilingPercent??v.ceilingPercent)
    }:defaultForm(workspace?.organizations??[]));
  };
  const save=async(form:CommissionForm)=>{
    setBusy(true);setError('');setNotice('');
    try{
      await channelRequest(apiBase,token,'/commission-config/board',{method:'POST',body:JSON.stringify({
        organizationId:form.organizationId,managerUserId:form.managerUserId?Number(form.managerUserId):null,
        salesUserId:form.salesUserId?Number(form.salesUserId):null,applyScope:form.applyScope,
        salesPercent:Number(form.salesPercent),managerPercent:Number(form.managerPercent),
        ceilingPercent:Number(form.ceilingPercent),managerCeilingPercent:Number(form.managerCeilingPercent)
      })});
      setEditor(null);setPage(1);setNotice('Đã lưu và áp dụng chính sách mới.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Không lưu được chính sách.');}
    finally{setBusy(false);}
  };
  const reset=async()=>{
    if(cancelId===null)return;
    setBusy(true);setError('');setNotice('');
    try{
      await channelRequest(apiBase,token,'/commission-config/board/'+cancelId+'/cancel',{method:'POST'});
      setCancelId(null);setSelected(null);setNotice('Đã khôi phục chính sách kế thừa.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Không khôi phục được chính sách.');}
    finally{setBusy(false);}
  };
  if(!authorized)return <p role="alert" className="rounded-xl border p-4 text-sm text-destructive">Không có quyền cấu hình chính sách hoa hồng.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Chính sách & hạn mức hoa hồng"
      description="Thiết lập giới hạn áp dụng ngay cho hệ thống, đối tác, Quản lý và Sales."
      actions={<AppButton leadingIcon={<Plus className="size-4"/>} disabled={loading||!workspace}
        onClick={()=>start()}>Thêm mới</AppButton>}/>
    {notice&&<output className="block "rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">{notice}</output>}
    {error&&<p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setOrganization('ALL');setScope('ALL');setPage(1);}}
        searchLabel="Tìm chính sách" placeholder="Tên tổ chức, Quản lý hoặc Sales..."
        filters={<div className="flex flex-wrap gap-2">
          <AppSelect ariaLabel="Lọc tổ chức" className="w-full sm:w-48" value={organization}
            options={[{value:'ALL',label:'Tất cả tổ chức'},...(workspace?.organizations??[]).map(o=>({value:String(o.id),label:o.name}))]}
            onValueChange={v=>{setOrganization(v);setPage(1);}}/>
          <AppSelect ariaLabel="Lọc phạm vi" className="w-full sm:w-48" value={scope}
            options={[{value:'ALL',label:'Tất cả phạm vi'},...['SYSTEM','ORGANIZATION','MANAGER','SALES'].map(v=>({value:v,label:scopeLabel(v)}))]}
            onValueChange={v=>{setScope(v);setPage(1);}}/>
        </div>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr>
            <th className="px-5 py-4">Phạm vi / Nhân sự</th>
            <th className="px-5 py-4">Tổ chức</th>
            <th className="px-5 py-4 text-right">Sales</th>
            <th className="px-5 py-4 text-right">Quản lý</th>
            <th className="px-5 py-4 text-right">Hạn mức tổng</th>
            <th className="px-5 py-4 text-right">Trần QL</th>
            <th className="px-5 py-4">Trạng thái</th>
            <th className="px-5 py-4 text-right">Thao tác</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {pageRows.map(v=><tr key={v.id} className="hover:bg-muted/30">
              <td className={adminTableCellClass}>
                <p className="font-semibold">{v.scope==='MANAGER'?person(v.managerUserId):v.scope==='SALES'?person(v.salesUserId):scopeLabel(v.scope)}</p>
                {v.scope==='SALES'&&<p className="text-xs text-muted-foreground">QL: {person(v.managerUserId)}</p>}
              </td>
              <td className={adminTableCellClass}>{orgName(v.organizationId)}</td>
              <td className={adminTableCellClass+' text-right tabular-nums'}>{v.salesPercent}%</td>
              <td className={adminTableCellClass+' text-right tabular-nums'}>{v.managerPercent}%</td>
              <td className={adminTableCellClass+' text-right font-semibold tabular-nums'}>{v.ceilingPercent}%</td>
              <td className={adminTableCellClass+' text-right tabular-nums'}>{v.managerCeilingPercent??v.ceilingPercent}%</td>
              <td className={adminTableCellClass}><AdminStatusBadge status={v.status}
                label={v.status==='RESET'?'Đã khôi phục':v.status==='ACTIVE'?'Đã áp dụng':'Đã hủy'}/></td>
              <td className={adminTableCellClass}><div className="flex justify-end gap-2">
                <AdminIconAction icon={Eye} label="Xem chi tiết chính sách" onClick={()=>setSelected(v)}/>
                {v.status==='ACTIVE'&&<AdminIconAction icon={Pencil} label="Điều chỉnh chính sách"
                  tone="blue" onClick={()=>start(v)}/>}
                {v.status==='ACTIVE'&&v.scope!=='SYSTEM'&&
                  <AdminIconAction icon={RotateCcw} label="Khôi phục cấu hình kế thừa"
                    tone="red" onClick={()=>setCancelId(v.id)}/>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
        {!loading&&pageRows.length===0&&<p className="p-7 text-center text-sm text-muted-foreground">Không có chính sách phù hợp.</p>}
        {loading&&<p className="p-7 text-center text-sm text-muted-foreground">Đang tải chính sách...</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={visible.length}
        onPageChange={setPage} pageSizeOptions={[10,20,50]}
        onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDrawer open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null)}}
      title="Chi tiết chính sách hoa hồng" description="Thông tin và thời điểm áp dụng được lưu tự động">
      {selected&&<dl className="grid grid-cols-2 gap-4 text-sm">
        {([
          ['Phạm vi',scopeLabel(selected.scope)],['Tổ chức',orgName(selected.organizationId)],
          ['Quản lý',person(selected.managerUserId)],['Sales',person(selected.salesUserId)],
          ['Hoa hồng Sales',selected.salesPercent+'%'],['Hoa hồng Quản lý',selected.managerPercent+'%'],
          ['Hạn mức tổng',selected.ceilingPercent+'%'],['Trần Quản lý',(selected.managerCeilingPercent??selected.ceilingPercent)+'%'],
          ['Người thao tác (ID)',String(selected.createdByUserId)],
          ['Thời gian áp dụng',dateTime(selected.createdAt)]
        ] as const).map(([label,value])=><div key={label}>
          <dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd>
        </div>)}
      </dl>}
    </AppDrawer>
    <BoardCommissionPolicyEditorDialog open={editor!==null} busy={busy}
      onClose={()=>{if(!busy){setEditor(null);setError('');}}}
      initial={editor} isReplacement={replacing} onSave={form=>void save(form)}
      organizations={workspace?.organizations??[]} members={workspace?.members??[]} error={error}/>
    <ConfirmDialog open={cancelId!==null} onOpenChange={open=>{if(!open&&!busy)setCancelId(null)}}
      title="Khôi phục chính sách kế thừa"
      description="Hệ thống áp dụng ngay chính sách cấp trên phù hợp. Các phiên bản cũ vẫn được giữ trong nhật ký."
      confirmLabel="Khôi phục" busy={busy} onConfirm={()=>void reset()}/>
  </div>;
}
