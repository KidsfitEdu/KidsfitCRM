'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Eye, Check } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppSelect } from '@/components/common/app-select';
import { AppPagination } from '@/components/common/app-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { FormError } from '@/components/common/form-error';
import { appNotice } from '@/components/common/app-toast-provider';
import { AdminListPanel,AdminListToolbar,AdminIconAction,AdminStatusBadge,adminTableClass,adminTableHeadClass } from '@/components/common/admin-list-ui';
import { fetchAdminOperations,reviewAdminProposal,fetchAdminProposalProfile,type AdminProposalProfile } from '@/services/proposal.service';
import { AdminProposalProfileEditor } from '@/components/crm/schools/admin-proposal-profile-editor';
import { SchoolProfileDetails, type SchoolProfileUnit } from '@/components/crm/schools/school-profile-details';
import { workflowDate,workflowLabels,type SchoolOperationsWorkspace } from '@/lib/school-operations';
import { AdminPageStatus } from '@/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function ProposalsPage({apiBase,token,abilities,onChanged}:AdminPageProps) {
  const [operations,setOperations]=useState<SchoolOperationsWorkspace|null>(null);
  const [search,setSearch]=useState('');const [proposalDraft,setProposalDraft]=useState('');
  const [statusFilter,setStatusFilter]=useState('ALL');
  const [page,setPage]=useState(1);const [proposalPageSize,setProposalPageSize]=useState(20);
  const proposalServerPage=Math.floor(((page-1)*proposalPageSize)/100)+1;
  const [busy,setBusy]=useState(false);const [reasonError,setReasonError]=useState('');
  const [selected,setSelected]=useState<number|null>(null);const [reason,setReason]=useState('');
  const [editing,setEditing]=useState<number|null>(null);
  const [detailId,setDetailId]=useState<number|null>(null);
  const [detail,setDetail]=useState<AdminProposalProfile|null>(null);
  const [detailLoading,setDetailLoading]=useState(false);
  const can=(permission:string)=>abilities.includes('*')||abilities.includes(permission);
  const preview=!apiBase;
  const reload=useCallback(async()=>{
    if(preview||!token)return;setBusy(true);
    try{setOperations(await fetchAdminOperations(apiBase,token,proposalServerPage,search,statusFilter));}
    catch(e){appNotice.error('Không tải được danh sách đề xuất.',e instanceof Error?e.message:'Vui lòng thử lại.');}
    finally{setBusy(false);}
  },[apiBase,token,preview,proposalServerPage,search,statusFilter]);
  useEffect(()=>{void reload();},[reload]);
  const updateProposal=async(id:number,approve:boolean,duplicateReviewed:boolean)=>{
    if(!reason.trim()){setReasonError('Cần nhập căn cứ quyết định.');return;}
    setReasonError('');setBusy(true);
    try{await reviewAdminProposal(apiBase,token,id,approve,reason,duplicateReviewed);setSelected(null);setReason('');appNotice.success(approve?'Đã phê duyệt đề xuất trường.':'Đã từ chối đề xuất trường.');await reload();try{await onChanged();}catch(e){appNotice.warning('Đã lưu, nhưng chưa cập nhật được dữ liệu tổng quan.',e instanceof Error?e.message:'Vui lòng mở lại trang.');}}
    catch(e){appNotice.error('Không lưu được quyết định đề xuất.',e instanceof Error?e.message:'Vui lòng thử lại.');}finally{setBusy(false);}
  };
  const openDetail=async(id:number)=>{
    if(preview)return;
    setDetailId(id);setDetail(null);setDetailLoading(true);
    try {
      const response=await fetchAdminProposalProfile(apiBase,token,id);
      setDetail(response.data);
    }catch(e){
      appNotice.error('Không xem được chi tiết đề xuất.',e instanceof Error?e.message:'Vui lòng thử lại.');
    }finally{setDetailLoading(false);}
  };
  const profileUnits=(profile:AdminProposalProfile):SchoolProfileUnit[]=>{
    if(profile.proposal_mode==='LEGACY' && profile.units.length===0)
      return [{id:-1,unit_type:'MAIN',name:profile.name,province:profile.province,ward:profile.ward,
        address:profile.address,contact_name:profile.contact_name,contact_position:profile.contact_position,
        contact_phone:profile.contact_phone,email:profile.email}];
    return [...(profile.target?[{...profile.target,id:-1}]:[]),
      ...profile.units.map((unit,i)=>({...unit,id:unit.id??i+1}))];
  };
  const proposalOffset=((page-1)*proposalPageSize)%100;
  const proposals=operations?.pagination?.page===proposalServerPage?operations.proposals.slice(proposalOffset,proposalOffset+proposalPageSize):[];
  return <AdminPageStatus apiBase={apiBase}>
    <div className="space-y-5">
  <AppPageHeader eyebrow="QUẢN TRỊ / ĐỀ XUẤT TRƯỜNG" title="Quản lý đề xuất trường" description="Tiếp nhận, rà soát và phê duyệt đề xuất trường theo thẩm quyền."/>
  <AdminListPanel>
    <AdminListToolbar search={proposalDraft} onSearchChange={setProposalDraft} onSearch={()=>{setPage(1);setSearch(proposalDraft.trim());}}
      onReset={()=>{setProposalDraft('');setSearch('');setStatusFilter('ALL');setPage(1);}}
      placeholder="Tên trường, địa chỉ..." searchLabel="Tìm đề xuất trường"
      filters={<AppSelect ariaLabel="Lọc trạng thái đề xuất" value={statusFilter} className="w-full sm:w-[200px]"
        options={[{value:'ALL',label:'Tất cả trạng thái'},{value:'PENDING_MANAGER',label:'Chờ Quản lý'},
          {value:'PENDING_ADMIN',label:'Chờ Admin'},{value:'APPROVED',label:'Đã duyệt'},{value:'REJECTED',label:'Từ chối'}]}
        onValueChange={next=>{setStatusFilter(next);setPage(1);}}/>}/>
    {busy && <p className="px-6 py-3 text-sm text-muted-foreground">Đang tải đề xuất…</p>}
    <div className="overflow-x-auto">
      <table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Người đề xuất</th>
          <th className="px-5 py-4 text-center">Trạng thái</th><th className="px-5 py-4 text-center">Hạn xử lý</th><th className="px-5 py-4 text-center">Thao tác</th></tr></thead>
        <tbody>{proposals.map(p=><tr key={p.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
          <td className="px-5 py-4"><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{[p.address,p.ward,p.province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}</p>
            {p.possible_duplicate && <p className="mt-1 text-xs text-amber-700">Cần kiểm tra trùng</p>}</td>
          <td className="px-5 py-4"><p>{p.submitted_by}</p><p className="mt-1 text-xs text-muted-foreground">Quản lý: {p.manager_name}</p></td>
          <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.status} label={workflowLabels[p.status]??p.status}/></td>
          <td className="px-5 py-4 text-center tabular-nums">{workflowDate(p.review_due_at)}</td>
          <td className="px-5 py-4"><div className="flex items-center justify-center gap-2">
            {p.status==='PENDING_ADMIN' && can('channel_sales.school.directory.manage') && !preview && <AdminIconAction icon={Pencil} tone="blue" label={`Chỉnh sửa ${p.name}`} onClick={()=>setEditing(p.id)}/>}
            {!preview && !['DRAFT','NEEDS_REVISION'].includes(p.status) && can('channel_sales.school.directory.manage') && <AdminIconAction icon={Eye} tone="neutral" label={`Xem chi tiết ${p.name}`} onClick={()=>void openDetail(p.id)}/>}
            {p.can_admin_review && !preview && <AdminIconAction icon={Check} tone="green" label={`Duyệt ${p.name}`} onClick={()=>{setSelected(p.id);setReason('');setReasonError('');}}/>}
          </div></td>
        </tr>)}</tbody>
      </table>
      {!busy && proposals.length===0 && <p className="p-8 text-center text-sm text-muted-foreground">Không có đề xuất phù hợp.</p>}
    </div>
    {operations?.pagination && <AppPagination page={page} pageSize={proposalPageSize}
      total={operations.pagination.totals.proposals ?? 0} showSummary={false}
      disabled={busy} pageSizeOptions={[10,20,50]}
      onPageChange={setPage}
      onPageSizeChange={size=>{setProposalPageSize(size);setPage(1);}}/>}
  </AdminListPanel>
</div>
    <AppDrawer open={detailId!==null} onOpenChange={open=>{if(!open){setDetailId(null);setDetail(null);}}}
      wide title={detail?.name??'Chi tiết đề xuất trường'} description="Thông tin trường chính, phân hiệu và người đề xuất.">
      {detailLoading?<p className="text-sm text-muted-foreground">Đang tải chi tiết…</p>:
        detail?<div className="space-y-5">
          <div className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Người đề xuất</p><p>{detail.submitted_by}</p></div>
            <div><p className="text-xs text-muted-foreground">Quản lý bán hàng</p><p>{detail.manager_name}</p></div>
            <div><p className="text-xs text-muted-foreground">Trạng thái</p><p>{workflowLabels[detail.status]??detail.status}</p></div>
            <div><p className="text-xs text-muted-foreground">Hạn xử lý</p><p>{workflowDate(detail.review_due_at)}</p></div>
            <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Loại đề xuất</p>
              <p>{detail.proposal_mode==='ADD_BRANCHES'?'Bổ sung phân hiệu vào trường hiện hữu':'Đề xuất trường chính mới'}</p></div>
          </div>
          {detail.proposal_mode==='ADD_BRANCHES'&&<p className="text-xs text-muted-foreground">Trường chính hiện hữu và các phân hiệu đề xuất được hiển thị cùng hồ sơ.</p>}
          <SchoolProfileDetails units={profileUnits(detail)}/>
        </div>:<p className="text-sm text-muted-foreground">Không tải được thông tin đề xuất.</p>}
    </AppDrawer>
    <AppDialog open={selected !== null} onOpenChange={open => {if(!open&&!busy)setSelected(null);}} busy={busy} title="Phê duyệt đề xuất trường" description="Kiểm tra thông tin và nhập căn cứ quyết định trước khi duyệt hoặc từ chối.">
      {(() => { const p=operations?.proposals.find(x=>x.id===selected); return p ? <div className="space-y-3">
        <p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{[p.address,p.ward,p.province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}</p>
        <p className="text-sm">Liên hệ: {p.contact_name || 'Chưa có'} · {p.contact_phone || 'Chưa có'}</p>
        {p.possible_duplicate && <p role="alert" className="text-sm text-amber-700">Có dấu hiệu trùng trường; vui lòng đối chiếu trước khi duyệt.</p>}
        <label htmlFor="admin-proposal-review-reason" className="block text-sm font-medium">Lý do / căn cứ quyết định<Input id="admin-proposal-review-reason" className="mt-1" value={reason} onChange={e=>{setReason(e.target.value);setReasonError('');}}/><FormError>{reasonError}</FormError></label>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>Hủy</Button><Button variant="outline" disabled={busy} onClick={()=>void updateProposal(p.id,false,false)}>Từ chối</Button><Button disabled={busy || !!p.possible_duplicate} onClick={()=>void updateProposal(p.id,true,false)}>Duyệt</Button></div>
      </div>:null; })()}
    </AppDialog>
    <AdminProposalProfileEditor open={editing!==null} proposalId={editing} apiBase={apiBase} token={token}
      onClose={()=>setEditing(null)} onSaved={async()=>{await reload();await onChanged();}}/>
  </AdminPageStatus>;
}
