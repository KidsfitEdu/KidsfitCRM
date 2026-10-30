'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Pencil, History, Check } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/app-button';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormActions } from '@/components/common/form-actions';
import { appNotice } from '@/components/common/app-toast-provider';
import { AdminListPanel,AdminListToolbar,AdminIconAction,AdminStatusBadge,adminTableClass,adminTableHeadClass } from '@/components/common/admin-list-ui';
import { fetchAdminOperations,reviewAdminProposal,editAdminProposal,fetchProposalRevisions } from '@/services/proposal.service';
import { workflowDate,workflowLabels,type SchoolOperationsWorkspace } from '@/lib/school-operations';
import { AdminPageStatus } from '@/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function ProposalsPage({apiBase,token,abilities,onChanged}:AdminPageProps) {
  const [operations,setOperations]=useState<SchoolOperationsWorkspace|null>(null);
  const [search,setSearch]=useState('');const [proposalDraft,setProposalDraft]=useState('');
  const [statusFilter,setStatusFilter]=useState('ALL');
  const [page,setPage]=useState(1);const [proposalPageSize,setProposalPageSize]=useState(20);
  const proposalServerPage=Math.floor(((page-1)*proposalPageSize)/100)+1;
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [selected,setSelected]=useState<number|null>(null);const [reason,setReason]=useState('');
  const [editing,setEditing]=useState<number|null>(null);
  const [editFields,setEditFields]=useState<Record<string,string>>({});
  const [revisions,setRevisions]=useState<{version:number;reason:string;created_at:string;actor_name:string}[]|null>(null);
  const can=(permission:string)=>abilities.includes('*')||abilities.includes(permission);
  const preview=!apiBase;
  const reload=useCallback(async()=>{
    if(preview||!token)return;setBusy(true);setError('');
    try{setOperations(await fetchAdminOperations(apiBase,token,proposalServerPage,search,statusFilter));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được dữ liệu.');}
    finally{setBusy(false);}
  },[apiBase,token,preview,proposalServerPage,search,statusFilter]);
  useEffect(()=>{void reload();},[reload]);
  const updateProposal=async(id:number,approve:boolean,duplicateReviewed:boolean)=>{
    if(!reason.trim()){setError('Cần nhập căn cứ quyết định.');return;}
    setBusy(true);setError('');
    try{await reviewAdminProposal(apiBase,token,id,approve,reason,duplicateReviewed);setSelected(null);setReason('');appNotice.success('Đã lưu quyết định đề xuất.');await reload();await onChanged();}
    catch(e){setError(e instanceof Error?e.message:'Không lưu được quyết định.');}finally{setBusy(false);}
  };
  const openEdit=(p:SchoolOperationsWorkspace['proposals'][number])=>{
    setEditing(p.id);setEditFields(Object.fromEntries(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email'].map(k=>[k,String(p[k as keyof typeof p]??'')])));setReason('');
  };
  const saveEdit=async(p:SchoolOperationsWorkspace['proposals'][number])=>{
    if(!reason.trim()){setError('Cần ghi lý do sửa đề xuất.');return;}
    setBusy(true);setError('');
    try{await editAdminProposal(apiBase,token,p.id,{expected_version:p.version,school_code:editFields.school_code,name:editFields.name,province:editFields.province,ward:editFields.ward,address:editFields.address,contact_name:editFields.contact_name,contact_position:editFields.contact_position,contact_phone:editFields.contact_phone,email:editFields.email,reason});
      setEditing(null);setReason('');appNotice.success('Đã cập nhật đề xuất và lưu lịch sử.');await reload();await onChanged();
    }catch(e){setError(e instanceof Error?e.message:'Không lưu được đề xuất.');}finally{setBusy(false);}
  };
  const showRevisions=async(id:number)=>{
    if(preview)return;setBusy(true);setError('');
    try{const result=await fetchProposalRevisions(apiBase,token,id);setRevisions(result.data.map(r=>({...r,created_at:r.createdAt})));}
    catch(e){setError(e instanceof Error?e.message:'Không xem được lịch sử.');}finally{setBusy(false);}
  };
  const proposalOffset=((page-1)*proposalPageSize)%100;
  const proposals=operations?.pagination?.page===proposalServerPage?operations.proposals.slice(proposalOffset,proposalOffset+proposalPageSize):[];
  return <AdminPageStatus apiBase={apiBase} error={error}>
    <div className="space-y-5">
  <AppPageHeader eyebrow="QUẢN TRỊ / ĐỀ XUẤT TRƯỜNG" title="Quản lý đề xuất trường" description="Tiếp nhận, rà soát và phê duyệt đề xuất trường theo thẩm quyền."
    actions={<AppButton tone="blue" premium leadingIcon={<RefreshCw className="size-4"/>} disabled={busy||preview} onClick={()=>void reload()}>Làm mới</AppButton>}/>
  <AdminListPanel>
    <AdminListToolbar search={proposalDraft} onSearchChange={setProposalDraft} onSearch={()=>{setPage(1);setSearch(proposalDraft.trim());}}
      onReset={()=>{setProposalDraft('');setSearch('');setStatusFilter('ALL');setPage(1);}}
      placeholder="Tên trường, mã trường..." searchLabel="Tìm đề xuất trường"
      filters={<AppNativeSelect aria-label="Lọc trạng thái đề xuất" value={statusFilter} containerClassName="h-11 w-full sm:w-[200px]" onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
        <option value="ALL">Tất cả trạng thái</option><option value="PENDING_MANAGER">Chờ Quản lý</option><option value="PENDING_ADMIN">Chờ Admin</option>
        <option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option>
      </AppNativeSelect>}/>
    {busy && <p className="px-6 py-3 text-sm text-muted-foreground">Đang tải đề xuất…</p>}
    <div className="overflow-x-auto">
      <table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Người đề xuất</th>
          <th className="px-5 py-4 text-center">Trạng thái</th><th className="px-5 py-4 text-center">Hạn xử lý</th><th className="px-5 py-4 text-center">Thao tác</th></tr></thead>
        <tbody>{proposals.map(p=><tr key={p.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
          <td className="px-5 py-4"><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.school_code} · {p.province} · {p.ward}</p>
            {p.possible_duplicate && <p className="mt-1 text-xs text-amber-700">Cần kiểm tra trùng</p>}</td>
          <td className="px-5 py-4"><p>{p.submitted_by}</p><p className="mt-1 text-xs text-muted-foreground">Quản lý: {p.manager_name}</p></td>
          <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.status} label={workflowLabels[p.status]??p.status}/></td>
          <td className="px-5 py-4 text-center tabular-nums">{workflowDate(p.review_due_at)}</td>
          <td className="px-5 py-4"><div className="flex items-center justify-center gap-2">
            {p.status==='PENDING_ADMIN' && can('channel_sales.school.directory.manage') && !preview && <AdminIconAction icon={Pencil} tone="blue" label={`Chỉnh sửa ${p.name}`} onClick={()=>openEdit(p)}/>}
            {!preview && can('channel_sales.school.directory.manage') && <AdminIconAction icon={History} tone="neutral" label={`Xem lịch sử ${p.name}`} onClick={()=>void showRevisions(p.id)}/>}
            {p.can_admin_review && !preview && <AdminIconAction icon={Check} tone="green" label={`Duyệt ${p.name}`} onClick={()=>{setSelected(p.id);setReason('');}}/>}
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
    <Dialog open={revisions!==null} onOpenChange={open=>{if(!open)setRevisions(null);}}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Lịch sử chỉnh sửa đề xuất</DialogTitle><DialogDescription>Các lần cập nhật được lưu theo phiên bản, người sửa, thời gian và lý do.</DialogDescription></DialogHeader>
      <div className="space-y-3">{revisions?.map(r=><div className="rounded-lg border p-3 text-sm" key={r.version}><strong>Phiên bản {r.version}</strong><p className="mt-1 text-muted-foreground">{r.actor_name} · {workflowDate(r.created_at)}</p><p className="mt-2">{r.reason}</p></div>)}{revisions?.length===0 && <p className="text-sm text-muted-foreground">Chưa có lần chỉnh sửa nào.</p>}</div>
    </DialogContent></Dialog>
    <Dialog open={selected !== null} onOpenChange={open => {if(!open&&!busy)setSelected(null);}}><DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>Phê duyệt đề xuất trường</DialogTitle><DialogDescription>Kiểm tra thông tin và nhập căn cứ quyết định trước khi duyệt hoặc từ chối.</DialogDescription></DialogHeader>
      {(() => { const p=operations?.proposals.find(x=>x.id===selected); return p ? <div className="space-y-3">
        <p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{p.school_code} · {p.province} · {p.ward}</p>
        <p className="text-sm">Liên hệ: {p.contact_name || 'Chưa có'} · {p.contact_phone || 'Chưa có'}</p>
        {p.possible_duplicate && <p role="alert" className="text-sm text-amber-700">Có dấu hiệu trùng trường; vui lòng đối chiếu trước khi duyệt.</p>}
        <label htmlFor="admin-proposal-review-reason" className="block text-sm font-medium">Lý do / căn cứ quyết định<Input id="admin-proposal-review-reason" className="mt-1" value={reason} onChange={e=>setReason(e.target.value)}/></label>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>Hủy</Button><Button variant="outline" disabled={busy} onClick={()=>void updateProposal(p.id,false,false)}>Từ chối</Button><Button disabled={busy || !!p.possible_duplicate} onClick={()=>void updateProposal(p.id,true,false)}>Duyệt</Button></div>
      </div>:null; })()}
    </DialogContent></Dialog>
    <Dialog open={editing !== null} onOpenChange={open => { if (!open && !busy) setEditing(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Chỉnh sửa đề xuất trường</DialogTitle><DialogDescription>Lưu nội dung trước/sau và lý do chỉnh sửa. Chỉ áp dụng khi chờ Admin duyệt.</DialogDescription></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">{(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email'] as const).map(k=><label key={k} className="text-xs font-medium">{({school_code:'Mã trường',name:'Tên trường',province:'Tỉnh/thành',ward:'Phường/xã',address:'Địa chỉ',contact_name:'Người liên hệ',contact_position:'Chức vụ',contact_phone:'Số điện thoại',email:'Email'} as Record<string,string>)[k]}<Input className="mt-1" value={editFields[k]??''} onChange={e=>setEditFields(o=>({...o,[k]:e.target.value}))}/></label>)}</div>
      <label htmlFor="admin-proposal-edit-reason" className="text-sm font-medium">Lý do chỉnh sửa<Input id="admin-proposal-edit-reason" className="mt-1" value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <FormActions busy={busy} onCancel={()=>setEditing(null)} onSave={()=>{const p=operations?.proposals.find(x=>x.id===editing);if(p)void saveEdit(p);}} saveLabel="Lưu thay đổi"/>
    </DialogContent></Dialog>
  </AdminPageStatus>;
}
