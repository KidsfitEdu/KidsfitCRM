'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, UsersRound, UserCheck, Building2, ShieldMinus } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { AppSelect } from '@/components/common/app-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppButton } from '@/components/common/buttons/app-button';
import { SalesHandoverDrawer } from './SalesHandoverDrawer';
import { channelRequest } from '@/lib/channel-operations';
import type { ManagerPageProps } from '@/types/manager-pages';

type Member={
 id:number;user_id:number;name:string;email:string;organization_id:number;organization_name:string;
 membership_type:string;status:string;school_approach_limit:number;active_schools:number;
 expiring_schools:number;contracts_reported:number;
};
type TeamResult={data:Member[];total:number;page:number;page_size:number;summary:{members:number;active:number;organizations:number}};

export function TeamPage({apiBase,token,abilities,onChanged,onSalesNavigate}:ManagerPageProps){
 const allowed=abilities.includes('*')||abilities.includes('channel_sales.team.manage');
 const connected=!!apiBase&&!!token&&allowed;
 const [team,setTeam]=useState<Member[]>([]);
 const [total,setTotal]=useState(0);
 const [summary,setSummary]=useState<TeamResult['summary']|null>(null);
 const [draft,setDraft]=useState('');
 const [search,setSearch]=useState('');
 const [status,setStatus]=useState('ALL');
 const [page,setPage]=useState(1);
 const [pageSize,setPageSize]=useState(20);
 const [selected,setSelected]=useState<Member|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [handoverId,setHandoverId]=useState<number|null>(null);
 const canHandover=abilities.includes('*')||abilities.includes('channel_sales.school.handover.manage');
 const load=useCallback(async()=>{
  if(!connected)return;
  setLoading(true);setError('');
  try{
    const params=new URLSearchParams({page:String(page),page_size:String(pageSize),status});
    if(search.trim())params.set('search',search.trim());
    const r=await channelRequest<TeamResult>(apiBase,token,'/manager/team?'+params);
    setTeam(r.data);setTotal(r.total);setSummary(r.summary);
  }catch(e){setTeam([]);setTotal(0);setSummary(null);setError(e instanceof Error?e.message:'Không tải được đội ngũ.');}
  finally{setLoading(false);}
 },[apiBase,token,connected,page,pageSize,search,status]);
 useEffect(()=>{void load();},[load]);
 if(!allowed)return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">Không có quyền quản lý đội ngũ bán hàng.</p>;
 return <div className="space-y-5">
  <AppPageHeader eyebrow="QUẢN LÝ BÁN HÀNG / ĐỘI NGŨ"
    title="Đội ngũ bán hàng" description="Theo dõi nhân sự, hạn mức tiếp cận và hợp đồng trong phạm vi quản lý."/>
  <div className="grid gap-3 sm:grid-cols-3">
   <AppStatCard icon={UsersRound} label="Nhân sự trong danh sách" value={summary?.members??'—'}/>
   <AppStatCard icon={UserCheck} label="Đang hoạt động" value={summary?.active??'—'}/>
   <AppStatCard icon={Building2} label="Đơn vị phụ trách" value={summary?.organizations??'—'}/>
  </div>
  {!connected&&<p className="rounded-xl border p-3 text-sm text-muted-foreground">Chế độ xem thử chưa kết nối dữ liệu nhân sự.</p>}
  {error&&<p role="alert" className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
  <AdminListPanel>
   <AdminListToolbar search={draft} onSearchChange={setDraft}
    onSearch={()=>{setSearch(draft.trim());setPage(1);}}
    onReset={()=>{setDraft('');setSearch('');setStatus('ALL');setPage(1);}}
    searchLabel="Tìm nhân sự" placeholder="Tên nhân sự, đơn vị, email..."
    filters={<AppSelect ariaLabel="Lọc trạng thái nhân sự" className="w-full sm:w-44" value={status}
      options={[{value:'ALL',label:'Tất cả trạng thái'},{value:'ACTIVE',label:'Đang hoạt động'},
        {value:'SUSPENDED',label:'Tạm dừng'},{value:'INACTIVE',label:'Không hoạt động'}]}
      onValueChange={next=>{setStatus(next);setPage(1);}}/>}/>
   <div className="overflow-x-auto"><table className={adminTableClass}>
    <thead className={adminTableHeadClass}><tr>
     <th className="px-5 py-4">Nhân sự</th><th className="px-5 py-4">Đơn vị</th>
     <th className="px-5 py-4">Hạn mức</th><th className="px-5 py-4">Đang phụ trách</th>
     <th className="px-5 py-4">Sắp hết hạn</th><th className="px-5 py-4">Hợp đồng</th>
     <th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-center">Thao tác</th>
    </tr></thead>
    <tbody className="divide-y divide-border/70">{team.map(item=><tr key={item.id} className="even:bg-muted/20 hover:bg-muted/40">
     <td className={adminTableCellClass}><p className="font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{item.membership_type.includes('COLLABORATOR')?'CTV':'SALES'} · {item.email}</p></td>
     <td className={adminTableCellClass}>{item.organization_name}</td>
     <td className={adminTableCellClass+' tabular-nums'}>{item.school_approach_limit}</td>
     <td className={adminTableCellClass+' tabular-nums'}>{item.active_schools}</td>
     <td className={adminTableCellClass+' tabular-nums'}>{item.expiring_schools}</td>
     <td className={adminTableCellClass+' tabular-nums'}>{item.contracts_reported}</td>
     <td className={adminTableCellClass}><AdminStatusBadge status={item.status} label={item.status==='ACTIVE'?'Hoạt động':item.status==='SUSPENDED'?'Tạm dừng':item.status}/></td>
     <td className={adminTableCellClass}><div className="flex items-center justify-center gap-3 whitespace-nowrap">
      <AdminIconAction icon={Eye} label={`Xem nhân sự ${item.name}`} onClick={()=>setSelected(item)}/>
      {connected&&canHandover&&item.status==='ACTIVE'&&<AdminIconAction icon={ShieldMinus} tone="red" label={`Thu hồi quyền tiếp cận: ${item.name}`} onClick={()=>setHandoverId(item.id)}/>}
     </div></td>
    </tr>)}</tbody>
   </table></div>
   {!loading&&!team.length&&<p className="p-10 text-center text-sm text-muted-foreground">Không có nhân sự phù hợp.</p>}
   {loading&&<p className="p-5 text-center text-sm text-muted-foreground">Đang tải danh sách...</p>}
   <AppPagination page={page} pageSize={pageSize} total={total} disabled={loading}
    showSummary={false} pageSizeOptions={[10,20,50]}
    onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
  </AdminListPanel>
  <AppDrawer open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}
    title="Chi tiết nhân sự" description="Thông tin nhân sự được phân quyền quản lý" bodyClassName="bg-muted/10">
   {selected&&<div className="space-y-4 text-sm">
<section className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><UsersRound className="size-6" aria-hidden="true"/></span><div className="min-w-0 space-y-2"><h2 className="break-words text-lg font-bold">{selected.name}</h2><p className="break-all text-xs text-muted-foreground">{selected.email}</p><div className="flex flex-wrap gap-2"><AdminStatusBadge status={selected.status} label={selected.status==='ACTIVE'?'Hoạt động':selected.status==='SUSPENDED'?'Tạm dừng':'Không hoạt động'}/><span className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs">{selected.membership_type.includes('COLLABORATOR')?'CTV':'Sales'}</span></div></div></section>
<section className="space-y-3 rounded-2xl border border-border bg-card p-4"><h3 className="flex items-center gap-2 font-bold"><Building2 className="size-4 text-primary" aria-hidden="true"/>Tổ chức & phân quyền</h3><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Đơn vị</dt><dd className="break-words font-semibold">{selected.organization_name}</dd></div><div><dt className="text-xs text-muted-foreground">Loại nhân sự</dt><dd className="font-semibold">{selected.membership_type.includes('COLLABORATOR')?'Cộng tác viên':'Nhân viên bán hàng'}</dd></div></dl></section>
<section className="space-y-4 rounded-2xl border border-border bg-card p-4"><h3 className="flex items-center gap-2 font-bold"><UserCheck className="size-4 text-primary" aria-hidden="true"/>Tình hình tiếp cận</h3><div className="grid grid-cols-3 gap-2">{[['Đang phụ trách',selected.active_schools],['Hạn mức',selected.school_approach_limit],['Còn suất',Math.max(0,selected.school_approach_limit-selected.active_schools)]].map(([label,value])=><div key={String(label)} className="min-w-0 rounded-xl bg-muted/50 p-2 text-center"><p className="text-xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div><div className="space-y-2"><div className="flex justify-between gap-2 text-xs"><span>Mức sử dụng hạn mức</span><span className="font-semibold">{selected.school_approach_limit>0?Math.round(selected.active_schools/selected.school_approach_limit*100)+'%':'Chưa đặt hạn mức'}</span></div><div role="progressbar" aria-label="Mức sử dụng hạn mức tiếp cận" aria-valuemin={0} aria-valuemax={100} aria-valuenow={selected.school_approach_limit>0?Math.min(100,Math.round(selected.active_schools/selected.school_approach_limit*100)):0} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:(selected.school_approach_limit>0?Math.min(100,selected.active_schools/selected.school_approach_limit*100):0)+'%'}}/></div></div><dl className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-muted-foreground">Trường sắp hết hạn</dt><dd className="font-semibold">{selected.expiring_schools}</dd></div><div><dt className="text-xs text-muted-foreground">Hợp đồng đã báo cáo</dt><dd className="font-semibold">{selected.contracts_reported}</dd></div></dl></section>
{connected&&canHandover&&selected.status==='ACTIVE'&&<AppButton tone="danger" onClick={()=>{setHandoverId(selected.id);setSelected(null);}}>Thu hồi quyền tiếp cận</AppButton>}
<p className="text-xs text-muted-foreground">Phân bổ và gia hạn được xử lý tại các màn nghiệp vụ tương ứng.</p>
</div>}
  </AppDrawer>
  <SalesHandoverDrawer apiBase={apiBase} token={token} membershipId={handoverId}
    onClose={()=>setHandoverId(null)} onChanged={async()=>{await load();await onChanged();}}
    onAllocate={()=>{setHandoverId(null);onSalesNavigate?.('manager-allocations');}}/>
 </div>;
}
