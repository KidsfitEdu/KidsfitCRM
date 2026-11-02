'use client';

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { Eye, UsersRound, UserCheck, Building2, Search } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { channelRequest, type ChannelManagement } from '@/lib/channel-operations';
import type { ManagerPageProps } from '@/types/manager-pages';

export function TeamPage({apiBase,token,abilities}:ManagerPageProps){
 const allowed=abilities.includes('*')||abilities.includes('channel_sales.team.manage');
 const [team,setTeam]=useState<ChannelManagement['team']>([]);
 const [draft,setDraft]=useState('');
 const [search,setSearch]=useState('');
 const [status,setStatus]=useState('ALL');
 const [page,setPage]=useState(1);
 const [pageSize,setPageSize]=useState(20);
 const [selected,setSelected]=useState<number|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!apiBase||!token||!allowed)return;
  setLoading(true);setError('');
  try{const r=await channelRequest<ChannelManagement>(apiBase,token,'/management');setTeam(r.team);}
  catch(e){setTeam([]);setError(e instanceof Error?e.message:'Không tải được đội ngũ.');}
  finally{setLoading(false);}
 },[apiBase,token,allowed]);
 useEffect(()=>{void load();},[load]);
 const filtered=useMemo(()=>team.filter(x=>(status==='ALL'||x.status===status)
   &&[x.name,x.email,x.organization_name].join(' ').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))),
   [team,status,search]);
 const currentPage=Math.min(page,Math.max(1,Math.ceil(filtered.length/pageSize)));
 const rows=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
 const selectedMember=team.find(x=>x.id===selected);
 if(!allowed)return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">Không có quyền quản lý đội ngũ bán hàng.</p>;
 return <div className="space-y-5">
  <AppPageHeader eyebrow="QUẢN LÝ BÁN HÀNG / ĐỘI NGŨ"
    title="Đội ngũ bán hàng" description="Theo dõi nhân sự SALES và tình trạng hoạt động trong phạm vi quản lý."/>
  <div className="grid gap-3 sm:grid-cols-3">
   <AppStatCard icon={UsersRound} label="Nhân sự trong danh sách" value={team.length}/>
   <AppStatCard icon={UserCheck} label="Đang hoạt động" value={team.filter(x=>x.status==='ACTIVE').length}/>
   <AppStatCard icon={Building2} label="Đơn vị phụ trách" value={new Set(team.map(x=>x.organization_id)).size}/>
  </div>
  {!apiBase&&<p className="rounded-xl border p-3 text-sm text-muted-foreground">Chế độ xem thử chưa kết nối dữ liệu nhân sự.</p>}
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
     <th className="px-5 py-4">Nhóm nhân sự</th><th className="px-5 py-4">Trạng thái</th>
     <th className="px-5 py-4 text-center">Thao tác</th>
    </tr></thead>
    <tbody className="divide-y divide-border/70">{rows.map(item=><tr key={item.id} className="even:bg-muted/20 hover:bg-muted/40">
     <td className={adminTableCellClass}><p className="font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">{item.email}</p></td>
     <td className={adminTableCellClass}>{item.organization_name}</td>
     <td className={adminTableCellClass}>{item.membership_type.includes('COLLABORATOR')?'CTV':'SALES'}</td>
     <td className={adminTableCellClass}><AdminStatusBadge status={item.status} label={item.status==='ACTIVE'?'Hoạt động':item.status==='SUSPENDED'?'Tạm dừng':item.status}/></td>
     <td className={adminTableCellClass}><div className="flex justify-center">
      <AdminIconAction icon={Eye} label={`Xem nhân sự ${item.name}`} onClick={()=>setSelected(item.id)}/>
     </div></td>
    </tr>)}</tbody>
   </table></div>
   {!loading&&!rows.length&&<p className="p-10 text-center text-sm text-muted-foreground">Không có nhân sự phù hợp.</p>}
   {loading&&<p className="p-5 text-center text-sm text-muted-foreground">Đang tải danh sách...</p>}
   <AppPagination page={currentPage} pageSize={pageSize} total={filtered.length} disabled={loading}
    showSummary={false} pageSizeOptions={[10,20,50]}
    onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
  </AdminListPanel>
  <AppDrawer open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null)}}
    title="Chi tiết nhân sự" description="Thông tin nhân sự được phân quyền quản lý">
   {selectedMember&&<div className="space-y-3 text-sm">
     <p><strong>Họ tên:</strong> {selectedMember.name}</p>
     <p><strong>Đơn vị:</strong> {selectedMember.organization_name}</p>
     <p><strong>Email:</strong> {selectedMember.email}</p>
     <p><strong>Loại:</strong> {selectedMember.membership_type}</p>
     <p><strong>Trạng thái:</strong> {selectedMember.status}</p>
     <p className="border-t pt-3 text-muted-foreground">Phân bổ, hợp đồng và gia hạn được xử lý tại các màn nghiệp vụ tương ứng, không điều chỉnh trong trang này.</p>
   </div>}
  </AppDrawer>
 </div>;
}
