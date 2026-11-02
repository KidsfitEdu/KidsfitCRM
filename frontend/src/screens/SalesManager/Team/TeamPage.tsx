'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, UsersRound, UserCheck, Building2 } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { channelRequest } from '@/lib/channel-operations';
import type { ManagerPageProps } from '@/types/manager-pages';

type Member={
 id:number;user_id:number;name:string;email:string;organization_id:number;organization_name:string;
 membership_type:string;status:string;school_approach_limit:number;active_schools:number;
 expiring_schools:number;contracts_reported:number;
};
type TeamResult={data:Member[];total:number;page:number;page_size:number;summary:{members:number;active:number;organizations:number}};

export function TeamPage({apiBase,token,abilities}:ManagerPageProps){
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
    filters={<AppNativeSelect aria-label="Lọc trạng thái nhân sự" containerClassName="w-full sm:w-44"
      value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
      <option value="ALL">Tất cả trạng thái</option>
      <option value="ACTIVE">Đang hoạt động</option>
      <option value="SUSPENDED">Tạm dừng</option>
      <option value="INACTIVE">Không hoạt động</option>
    </AppNativeSelect>}/>
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
     <td className={adminTableCellClass}><div className="flex justify-center">
      <AdminIconAction icon={Eye} label={`Xem nhân sự ${item.name}`} onClick={()=>setSelected(item)}/>
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
    title="Chi tiết nhân sự" description="Thông tin nhân sự được phân quyền quản lý">
   {selected&&<div className="space-y-3 text-sm">
     <p><strong>Họ tên:</strong> {selected.name}</p>
     <p><strong>Đơn vị:</strong> {selected.organization_name}</p>
     <p><strong>Email:</strong> {selected.email}</p>
     <p><strong>Nhóm:</strong> {selected.membership_type}</p>
     <p><strong>Hạn mức tiếp cận:</strong> {selected.active_schools}/{selected.school_approach_limit} trường</p>
     <p><strong>Sắp hết hạn:</strong> {selected.expiring_schools} trường</p>
     <p><strong>Hợp đồng đã báo cáo:</strong> {selected.contracts_reported}</p>
     <p><strong>Trạng thái:</strong> {selected.status}</p>
     <p className="border-t pt-3 text-muted-foreground">Thao tác phân bổ, gia hạn và xác minh hợp đồng được xử lý tại các màn nghiệp vụ tương ứng.</p>
   </div>}
  </AppDrawer>
 </div>;
}
