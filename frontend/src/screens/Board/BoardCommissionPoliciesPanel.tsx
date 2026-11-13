'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, Pencil, RotateCcw, UsersRound } from 'lucide-react';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { appNotice } from '@/components/common/app-toast-provider';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppSelect } from '@/components/common/app-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AdminListPanel, AdminListToolbar, AdminIconAction, adminTableClass,
  adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { BoardCommissionDialog, type CommissionFormValues, type CommissionManager,
  type CommissionOrganization, type CommissionSales } from './BoardCommissionDialog';
import { channelRequest } from '@/lib/channel-operations';
import { resolveManagerCommissionForm } from './commission-manager-policy';
import type { RolePageProps } from '@/types/role-pages';

type PolicyVersion = {
  id:number;scope:'SYSTEM'|'MANAGER'|'SALES';organizationId:number|null;
  managerUserId:number|null;salesUserId:number|null;
  salesPercent:number;managerPercent:number;status:string;createdAt:string;createdByUserId:number;
};
type SalesRow=CommissionSales&{
  managerName:string|null;managerEmail:string|null;
  salesPercent:number;managerPercent:number;totalPercent:number;
  source:string;versionId:number|null;ownVersionId:number|null;hasOwnOverride:boolean;
};
type Workspace={
  defaults:{salesPercent:number;managerPercent:number;versionId:number|null;isConfigured:boolean};
  organizations:CommissionOrganization[];managers:CommissionManager[];
  data:SalesRow[];history:PolicyVersion[];
};
// The ASP.NET API uses JsonNamingPolicy.SnakeCaseLower; keep its wire DTO
// separate from the camelCase values used by this screen.
type ApiPolicyVersion = {
  id:number; scope:'SYSTEM'|'MANAGER'|'SALES'; organization_id:number|null;
  manager_user_id:number|null; sales_user_id:number|null;
  sales_percent:number; manager_percent:number; status:string;
  created_at:string; created_by_user_id:number;
};
type ApiWorkspace = {
  defaults:{sales_percent:number;manager_percent:number;version_id:number|null;is_configured:boolean};
  organizations:CommissionOrganization[];
  managers:Array<Omit<CommissionManager,'organizationId'>&{organization_id:number}>;
  data:Array<Omit<CommissionSales,'organizationId'|'userId'|'managerUserId'>&{
    organization_id:number;user_id:number;manager_user_id:number|null;
    manager_name:string|null;manager_email:string|null;
    sales_percent:number;manager_percent:number;total_percent:number;
    source:string;version_id:number|null;own_version_id:number|null;has_own_override:boolean;
  }>;
  history:ApiPolicyVersion[];
};
const requireRate=(value:number,field:string):number=>{
  if(typeof value!=='number'||!Number.isFinite(value)){
    throw new Error('API trả về tỷ lệ hoa hồng không hợp lệ: '+field+'.');
  }
  return value;
};
const mapWorkspace=(raw:ApiWorkspace):Workspace=>({
  defaults:{
    salesPercent:requireRate(raw.defaults.sales_percent,'sales_percent'),
    managerPercent:requireRate(raw.defaults.manager_percent,'manager_percent'),
    versionId:raw.defaults.version_id,isConfigured:raw.defaults.is_configured
  },
  organizations:raw.organizations,
  managers:raw.managers.map(m=>({
    id:m.id,organizationId:m.organization_id,name:m.name,email:m.email,code:m.code
  })),
  data:raw.data.map(s=>({
    userId:s.user_id,organizationId:s.organization_id,managerUserId:s.manager_user_id,
    name:s.name,email:s.email,code:s.code,managerName:s.manager_name,managerEmail:s.manager_email,
    salesPercent:requireRate(s.sales_percent,'sales_percent'),
    managerPercent:requireRate(s.manager_percent,'manager_percent'),
    totalPercent:requireRate(s.total_percent,'total_percent'),
    source:s.source,versionId:s.version_id,ownVersionId:s.own_version_id,
    hasOwnOverride:s.has_own_override
  })),
  history:raw.history.map(p=>({
    id:p.id,scope:p.scope,organizationId:p.organization_id,
    managerUserId:p.manager_user_id,salesUserId:p.sales_user_id,
    salesPercent:requireRate(p.sales_percent,'sales_percent'),
    managerPercent:requireRate(p.manager_percent,'manager_percent'),
    status:p.status,createdAt:p.created_at,createdByUserId:p.created_by_user_id
  }))
});
const formatTime=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
const sourceLabel=(source:string)=>source==='SALES'?'Điều chỉnh riêng Sales':
  source==='MANAGER'?'Theo Quản lý':'Mặc định hệ thống';

export function BoardCommissionPoliciesPanel({apiBase,token,abilities}:RolePageProps){
  const can=abilities.includes('*')||abilities.includes('channel_sales.policy.manage');
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [formError,setFormError]=useState('');
  const [dialog,setDialog]=useState<CommissionFormValues|null>(null);
  const [detail,setDetail]=useState<SalesRow|null>(null);
  const [confirmReset,setConfirmReset]=useState<SalesRow|null>(null);
  const [defaultHistoryOpen,setDefaultHistoryOpen]=useState(false);
  const [org,setOrg]=useState('ALL');
  const [manager,setManager]=useState('ALL');
  const [sales,setSales]=useState('ALL');
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const load=useCallback(async()=>{
    if(!apiBase||!token||!can)return;
    setLoading(true);setError('');
    try{setWorkspace(mapWorkspace(await channelRequest<ApiWorkspace>(apiBase,token,'/board-commission')));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được chính sách hoa hồng.');}
    finally{setLoading(false);}
  },[apiBase,token,can]);
  useEffect(()=>{queueMicrotask(()=>void load());},[load]);

  const history=workspace?.history??[];
  const defaults=workspace?.defaults??{salesPercent:25,managerPercent:5,versionId:null,isConfigured:false};
  const orgs=workspace?.organizations??[];
  const people=workspace?.data??[];
  const managers=workspace?.managers??[];
  const filterRows=people.filter(p=>org==='ALL'||String(p.organizationId)===org);
  const filteredManagers=managers.filter(m=>filterRows.some(p=>p.managerUserId===m.id));
  const filteredSales=filterRows.filter(p=>manager==='ALL'||String(p.managerUserId)===manager);
  const visible=filteredSales.filter(p=>(sales==='ALL'||String(p.userId)===sales)
    &&[p.name,p.email,p.managerName??'',p.managerEmail??'']
      .some(s=>s.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))));
  const pageRows=visible.slice((page-1)*pageSize,page*pageSize);
  const startManager=()=>{
    setFormError('');
    setDialog({
      scope:'MANAGER',organizationId:null,managerUserId:null,salesUserId:null,
      salesPercent:String(defaults.salesPercent),managerPercent:String(defaults.managerPercent),
      expectedVersionId:null
    });
  };
  const getManagerRates=(organizationId:number,managerUserId:number)=>
    resolveManagerCommissionForm(history,defaults,organizationId,managerUserId);
  const startDefault=()=>{
    setFormError('');setDialog({
      scope:'SYSTEM',organizationId:null,managerUserId:null,salesUserId:null,
      salesPercent:String(defaults.salesPercent),managerPercent:String(defaults.managerPercent),
      expectedVersionId:defaults.versionId
    });
  };
  const startSales=(person:SalesRow)=>{
    setFormError('');setDialog({
      scope:'SALES',organizationId:person.organizationId,managerUserId:person.managerUserId,
      salesUserId:person.userId,salesPercent:String(person.salesPercent),
      managerPercent:String(person.managerPercent),expectedVersionId:person.ownVersionId
    });
  };
  const save=async(v:CommissionFormValues)=>{
    const previous=history.filter(h=>h.scope===v.scope&&
      (v.scope==='SYSTEM'||(h.organizationId===v.organizationId&&
        (v.scope==='MANAGER'?h.managerUserId===v.managerUserId:h.salesUserId===v.salesUserId))))
      .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id-a.id)[0];
    setBusy(true);setFormError('');
    try{
      await channelRequest(apiBase,token,'/board-commission',{method:'POST',body:JSON.stringify({
        scope:v.scope,organization_id:v.scope==='SYSTEM'?null:v.organizationId,
        manager_user_id:v.scope==='MANAGER'?v.managerUserId:null,
        sales_user_id:v.scope==='SALES'?v.salesUserId:null,
        sales_percent:Number(v.salesPercent),manager_percent:Number(v.managerPercent),
        expected_version_id:previous?.id??null
      })});
      setDialog(null);await load();
      appNotice.success('Đã lưu và áp dụng tỷ lệ hoa hồng mới.');
    }catch(e){
      const message=e instanceof Error?e.message:'Không thể lưu chính sách.';
      setFormError(message);
      appNotice.error('Không thể lưu chính sách hoa hồng.',message);
    }
    finally{setBusy(false);}
  };
  const reset=async()=>{
    if(!confirmReset?.ownVersionId)return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/board-commission/'+confirmReset.ownVersionId+'/reset',{
        method:'POST',body:JSON.stringify({expected_version_id:confirmReset.ownVersionId})
      });
      setConfirmReset(null);await load();
      appNotice.success('Đã khôi phục chính sách kế thừa.');
    }catch(e){
      appNotice.error('Không khôi phục được chính sách.',e instanceof Error?e.message:'Vui lòng thử lại.');
    }
    finally{setBusy(false);}
  };
  const revisions=detail?history.filter(h=>h.scope==='SALES'&&
    h.organizationId===detail.organizationId&&h.salesUserId===detail.userId):[];
  if(!can)return <p role="alert" className="rounded-xl border p-4 text-sm text-destructive">
    Tài khoản chưa được cấp quyền quản lý chính sách hoa hồng.</p>;
  return <div className="space-y-5">
    <section className="rounded-2xl border border-border/80 bg-card px-5 py-5 shadow-sm sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-[#1b5e20] dark:bg-green-950 dark:text-green-300">
            <UsersRound className="size-5" aria-hidden="true"/>
          </span>
          <div><h3 className="text-lg font-semibold">Mặc định hệ thống</h3>
            <p className="text-sm text-muted-foreground">Áp dụng cho Sales chưa có cấu hình riêng hoặc theo Quản lý.</p></div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <AdminIconAction icon={Eye} label="Xem lịch sử hoa hồng mặc định" onClick={()=>setDefaultHistoryOpen(true)}/>
          <AdminIconAction icon={Pencil} tone="green" label="Chỉnh sửa hoa hồng mặc định" onClick={startDefault}/>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {([{label:'Sales hưởng',value:defaults.salesPercent},{label:'Quản lý hưởng',value:defaults.managerPercent},
          {label:'Tổng hoa hồng',value:defaults.salesPercent+defaults.managerPercent}] as const).map(x=>
          <div key={x.label} className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">{x.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{x.value}%</p>
          </div>)}
      </div>
    </section>

    <section className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-lg font-bold">Danh sách hoa hồng theo Sales</h3>
        <p className="mt-1 text-sm text-muted-foreground">Cùng một Quản lý có thể có tỷ lệ khác nhau theo từng Sales.</p></div>
      <AppButton leadingIcon={<UsersRound className="size-4"/>} onClick={startManager}>
        Cấu hình theo Quản lý
      </AppButton>
    </section>

    {error&&<p role="alert" className="rounded-xl border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}

    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft} searchLabel="Tìm Sales theo họ tên hoặc email"
        placeholder="Tìm tên hoặc email Sales, Quản lý..."
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setOrg('ALL');setManager('ALL');setSales('ALL');setPage(1);}}
        filters={<div className="flex flex-wrap gap-2">
          <AppSelect ariaLabel="Lọc tổ chức" className="w-full sm:w-44" value={org}
            options={[{value:'ALL',label:'Tất cả tổ chức'},...orgs.map(o=>({value:String(o.id),label:o.name}))]}
            onValueChange={v=>{setOrg(v);setManager('ALL');setSales('ALL');setPage(1);}}/>
          <AppSelect ariaLabel="Lọc Quản lý" className="w-full sm:w-44" value={manager}
            options={[{value:'ALL',label:'Tất cả Quản lý'},...filteredManagers.map(m=>({value:String(m.id),label:m.name}))]}
            onValueChange={v=>{setManager(v);setSales('ALL');setPage(1);}}/>
          <AppSelect ariaLabel="Lọc Sales" className="w-full sm:w-44" value={sales}
            options={[{value:'ALL',label:'Tất cả Sales'},...filteredSales.map(s=>({value:String(s.userId),label:s.name+' · '+s.email}))]}
            onValueChange={v=>{setSales(v);setPage(1);}}/>
        </div>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}>
            <tr>
              <th className="px-5 py-4">Họ và tên Sales</th>
              <th className="px-5 py-4">Quản lý phụ trách</th>
              <th className="px-5 py-4">Tổ chức</th>
              <th className="px-5 py-4 text-right">Sales (%)</th>
              <th className="px-5 py-4 text-right">Quản lý (%)</th>
              <th className="px-5 py-4 text-right">Tổng (%)</th>
              <th className="px-5 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.map(p=><tr key={p.organizationId+'-'+p.userId} className="hover:bg-muted/30">
              <td className={adminTableCellClass}>
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="mt-0.5 break-all text-xs text-muted-foreground">{p.email||'Chưa có email'}</p>
              </td>
              <td className={adminTableCellClass}>{p.managerName??'Chưa phân công'}</td>
              <td className={adminTableCellClass}>{orgs.find(o=>o.id===p.organizationId)?.name??'—'}</td>
              <td className={adminTableCellClass+' text-right tabular-nums'}>{p.salesPercent}%</td>
              <td className={adminTableCellClass+' text-right tabular-nums'}>{p.managerPercent}%</td>
              <td className={adminTableCellClass+' text-right font-semibold tabular-nums'}>{p.totalPercent}%</td>
              <td className={adminTableCellClass}>
                <div className="flex justify-end gap-2">
                  <AdminIconAction icon={Eye} label={'Xem lịch sử hoa hồng '+p.name} onClick={()=>setDetail(p)}/>
                  <AdminIconAction icon={Pencil} tone="blue" label={'Điều chỉnh tỷ lệ '+p.name} onClick={()=>startSales(p)}/>
                  <AdminIconAction icon={RotateCcw} tone="neutral" disabled={!p.hasOwnOverride}
                    label={'Khôi phục tỷ lệ kế thừa '+p.name} onClick={()=>setConfirmReset(p)}/>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
        {loading&&<p className="p-6 text-center text-sm text-muted-foreground">Đang tải danh sách nhân sự...</p>}
        {!loading&&pageRows.length===0&&<p className="p-6 text-center text-sm text-muted-foreground">Không có Sales phù hợp.</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={visible.length} onPageChange={setPage}
        pageSizeOptions={[10,20,50]} onPageSizeChange={n=>{setPageSize(n);setPage(1);}} disabled={loading}/>
    </AdminListPanel>

    <AppDrawer open={defaultHistoryOpen} onOpenChange={setDefaultHistoryOpen}
      title="Lịch sử hoa hồng mặc định" description="Các phiên bản trước/sau của chính sách toàn hệ thống">
      <div className="space-y-3">
        {history.filter(h=>h.scope==='SYSTEM').map(h=><div key={h.id} className="rounded-xl border border-border p-4 text-sm">
          <p className="font-semibold">Sales {h.salesPercent}% · Quản lý {h.managerPercent}%</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatTime(h.createdAt)} · BGĐ (ID): {h.createdByUserId}</p>
        </div>)}
        {!history.some(h=>h.scope==='SYSTEM')&&<p className="text-sm text-muted-foreground">
          Chưa có thay đổi riêng. Đang sử dụng mức mặc định ban đầu 25% + 5%.
        </p>}
      </div>
    </AppDrawer>
    <BoardCommissionDialog initial={dialog} organizations={orgs} managers={managers} sales={people}
      error={formError} busy={busy} managerOnly={dialog?.scope==='MANAGER'} resolveManagerPolicy={getManagerRates}
      lockTarget={dialog?.scope==='SYSTEM'||(dialog?.scope==='SALES'&&dialog.salesUserId!==null)||dialog?.expectedVersionId!==null} onClose={()=>{if(!busy){setDialog(null);setFormError('');}}}
      onSave={form=>void save(form)}/>
    <AppDrawer open={detail!==null} onOpenChange={v=>{if(!v)setDetail(null)}}
      title="Chi tiết hoa hồng Sales" description="Tỷ lệ áp dụng và lịch sử thay đổi">
      {detail&&<div className="space-y-4 text-sm">
        <div><p className="text-lg font-semibold">{detail.name}</p>
          <p className="break-all text-muted-foreground">{detail.email}</p></div>
        <dl className="grid grid-cols-2 gap-3 rounded-xl border p-4">
          <div><dt className="text-muted-foreground">Quản lý</dt><dd className="font-semibold">{detail.managerName??'—'}</dd></div>
          <div><dt className="text-muted-foreground">Nguồn cấu hình</dt><dd className="font-semibold">{sourceLabel(detail.source)}</dd></div>
          <div><dt className="text-muted-foreground">Sales hưởng</dt><dd>{detail.salesPercent}%</dd></div>
          <div><dt className="text-muted-foreground">Quản lý hưởng</dt><dd>{detail.managerPercent}%</dd></div>
        </dl>
        <h4 className="font-semibold">Lịch sử điều chỉnh riêng</h4>
        {revisions.map(v=><div key={v.id} className="rounded-xl border p-3">
          <p className="font-medium">{v.status==='RESET'?'Khôi phục kế thừa':v.salesPercent+'% Sales + '+v.managerPercent+'% Quản lý'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatTime(v.createdAt)} · Người cập nhật (ID): {v.createdByUserId}</p>
        </div>)}
        {revisions.length===0&&<p className="text-muted-foreground">Chưa có điều chỉnh riêng, đang kế thừa chính sách.</p>}
      </div>}
    </AppDrawer>
    <ConfirmDialog open={confirmReset!==null} onOpenChange={v=>{if(!v&&!busy)setConfirmReset(null)}}
      title="Khôi phục tỷ lệ kế thừa" busy={busy}
      description={'Sales '+(confirmReset?.name??'')+' sẽ quay về chính sách của Quản lý phụ trách hoặc mặc định hệ thống. Lịch sử cũ vẫn được giữ.'}
      confirmLabel="Khôi phục" onConfirm={()=>void reset()}/>
  </div>;
}
