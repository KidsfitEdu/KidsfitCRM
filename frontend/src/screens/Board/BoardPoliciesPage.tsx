'use client';

import { useState } from 'react';
import { Eye, Pencil, CheckCircle2, Trash2, Plus, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { PolicyEditorDialog, type PolicyForm } from './PolicyEditorDialog';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace, WorkflowPolicy } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

const EMPTY_ORGANIZATIONS: SchoolOperationsWorkspace['organizations'] = [];
type PolicyListResult = {items:WorkflowPolicy[];pagination:{page:number;page_size:number;total:number}};

export function BoardPoliciesPage({apiBase,token,abilities}:RolePageProps) {
  const [organization,setOrganization]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [detailId,setDetailId]=useState<number|null>(null);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [editorOpen,setEditorOpen]=useState(false);
  const [confirm,setConfirm]=useState<{id:number;action:'activate'|'cancel'|'reapply'}|null>(null);
  const [busy,setBusy]=useState(false);
  const [actionError,setActionError]=useState('');
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.escalation.resolve')||abilities.includes('channel_sales.school.dispute.resolve');
  const connected=Boolean(apiBase&&token&&allowed);
  const canManage=abilities.includes('*')||abilities.includes('channel_sales.school.workflow_policy.manage');
  const query=useQuery({
    queryKey:['board','policies',apiBase],
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1'),
    enabled:connected,
  });
  const data=query.data;
  const policyQuery=useQuery({
    queryKey:['board','policy-versions',apiBase,page,pageSize,search,organization],
    queryFn:()=>channelRequest<PolicyListResult>(apiBase,token,
      '/school-workflow-policies?page='+page+'&page_size='+pageSize
        +'&search='+encodeURIComponent(search)
        +(organization==='ALL'?'':'&organization_id='+encodeURIComponent(organization))),
    enabled:connected,
  });
  const policies=policyQuery.data?.items??[];
  const orgName=(id:number)=>data?.organizations.find(x=>x.id===id)?.name??String(id);
  const visiblePolicies=policies;
  const detail=policies.find(p=>p.id===detailId);
  const confirmingPolicy=policies.find(p=>p.id===confirm?.id);
  const editing=policies.find(p=>p.id===editingId)??null;
  const write=async (path:string,method:'POST'|'PATCH',body:unknown)=>{
    setActionError('');setBusy(true);
    try{
      await channelRequest(apiBase,token,path,{method,body:JSON.stringify(body)});
      setEditorOpen(false);setEditingId(null);setConfirm(null);
      setPage(1);
      await query.refetch();
      await policyQuery.refetch();
    }catch(error){setActionError(error instanceof Error?error.message:'Không thể cập nhật chính sách.');}
    finally{setBusy(false);}
  };
  const save=(form:PolicyForm)=>{
    const payload={
      manager_review_hours:form.manager_review_hours,admin_review_hours:form.admin_review_hours,
      invitation_hours:form.invitation_hours,max_extension_days:form.max_extension_days,
      max_extension_count:form.max_extension_count,max_total_extension_days:form.max_total_extension_days,
    };
    if(editingId!==null)void write('/school-workflow-policies/'+editingId+'/draft','PATCH',{...payload,organization_id:form.organization_id});
    else void write('/school-workflow-policies','POST',{...payload,organization_id:form.organization_id,activate:false});
  };
  const confirmAction=()=>{
    if(!confirm)return;
    // No manual reason is required in the popup. Keep a unique traceable reference
    // for the existing backend approval and audit contracts.
    const reference = 'POLICY-'+confirm.action.toUpperCase()+'-'+confirm.id+'-'+Date.now().toString(36)
      +'-'+Math.random().toString(36).slice(2,10);
    const body = confirm.action==='cancel'
      ? {reason:'BGĐ xác nhận xóa bản nháp chính sách.'}
      : {decision_reference:reference};
    void write('/school-workflow-policies/'+confirm.id+'/'+confirm.action,'POST',body);
  };
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Chính sách vận hành"
      description="Quản lý phiên bản chính sách và thời hạn áp dụng."
      actions={canManage&&<AppButton leadingIcon={<Plus className="size-4"/>}
        onClick={()=>{setEditingId(null);setActionError('');setEditorOpen(true);}}>Thêm mới</AppButton>}/>
    {!connected&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Chưa kết nối API hoặc chưa đủ quyền xem chính sách.</p>}
    {actionError&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
    {(query.error||policyQuery.error)&&<p className="rounded-xl border border-red-300 p-4 text-sm text-red-600" role="alert">{(policyQuery.error??query.error) instanceof Error?(policyQuery.error??query.error as Error).message:'Không tải được chính sách.'}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setOrganization('ALL');setPage(1);}}
        searchLabel="Tìm chính sách" placeholder="Tên tổ chức, phiên bản..."
        filters={<AppNativeSelect aria-label="Lọc tổ chức" containerClassName="w-full sm:w-56"
          value={organization} onChange={e=>{setOrganization(e.target.value);setPage(1);}}>
          <option value="ALL">Tất cả tổ chức</option>
          {(data?.organizations??[]).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </AppNativeSelect>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Tổ chức</th><th className="px-5 py-4">Phiên bản</th><th className="px-5 py-4">Thời hạn xử lý</th><th className="px-5 py-4">Gia hạn</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
          <tbody>{visiblePolicies.map(p=><tr className="border-b" key={p.id}>
            <td className="px-5 py-4 font-medium">{orgName(p.organization_id)}</td>
            <td className="px-5 py-4">{p.version}</td>
            <td className="px-5 py-4">Quản lý {p.manager_review_hours}h · Admin {p.admin_review_hours}h · Phân bổ {p.invitation_hours}h</td>
            <td className="px-5 py-4">{p.max_extension_days} ngày/lần · {p.max_extension_count} lần</td>
            <td className="px-5 py-4"><AdminStatusBadge status={p.status} label={p.status==='ACTIVE'?'Đang áp dụng':p.status==='DRAFT'?'Bản nháp':p.status==='CANCELLED'?'Đã hủy':'Đã thay phiên bản'}/></td>
            <td className="px-5 py-4 text-right"><div className="flex items-center justify-end gap-2">
              <AdminIconAction icon={Eye} label="Xem chi tiết chính sách" onClick={()=>setDetailId(p.id)}/>
              {canManage&&p.status==='SUPERSEDED'&&<AdminIconAction icon={RotateCcw} tone="blue"
                label="Áp dụng lại phiên bản chính sách" onClick={()=>{
                  setConfirm({id:p.id,action:'reapply'});setActionError('');
                }}/>}
              {canManage&&p.status==='DRAFT'&&<>
                <AdminIconAction icon={Pencil} tone="blue" label="Sửa bản nháp chính sách"
                  onClick={()=>{setEditingId(p.id);setActionError('');setEditorOpen(true);}}/>
                <AdminIconAction icon={CheckCircle2} label="Kích hoạt chính sách"
                  onClick={()=>{setConfirm({id:p.id,action:'activate'});setActionError('');}}/>
                <AdminIconAction icon={Trash2} tone="red" label="Hủy bản nháp chính sách"
                  onClick={()=>{setConfirm({id:p.id,action:'cancel'});setActionError('');}}/>
              </>}
              </div></td>
          </tr>)}</tbody>
        </table>
        {connected&&!policyQuery.isFetching&&!policies.length&&<p className="p-7 text-center text-sm text-muted-foreground">Không có phiên bản chính sách phù hợp trong trang này.</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={policyQuery.data?.pagination.total??0}
        onPageChange={setPage} pageSizeOptions={[10,20,50,100]}
        onPageSizeChange={size=>{setPageSize(size);setPage(1);}}
        disabled={policyQuery.isFetching} showSummary={false}/>
    </AdminListPanel>
    <AppDrawer open={detailId!==null} onOpenChange={open=>{if(!open)setDetailId(null);}} title="Chi tiết chính sách">
      {detail&&<div className="space-y-4 text-sm">
        <h3 className="text-lg font-semibold">{orgName(detail.organization_id)} · Phiên bản {detail.version}</h3>
        <AdminStatusBadge status={detail.status} label={detail.status==='ACTIVE'?'Đang áp dụng':detail.status==='DRAFT'?'Bản nháp':detail.status==='CANCELLED'?'Đã hủy':'Đã thay phiên bản'}/>
        <dl className="grid grid-cols-2 gap-4 rounded-xl border p-4">
          <div><dt className="text-muted-foreground">Quản lý phản hồi</dt><dd className="font-semibold">{detail.manager_review_hours} giờ</dd></div>
          <div><dt className="text-muted-foreground">Admin phản hồi</dt><dd className="font-semibold">{detail.admin_review_hours} giờ</dd></div>
          <div><dt className="text-muted-foreground">Phân bổ</dt><dd className="font-semibold">{detail.invitation_hours} giờ</dd></div>
          <div><dt className="text-muted-foreground">Gia hạn mỗi lần</dt><dd className="font-semibold">{detail.max_extension_days} ngày</dd></div>
          <div><dt className="text-muted-foreground">Số lần gia hạn</dt><dd className="font-semibold">{detail.max_extension_count} lần</dd></div>
          <div><dt className="text-muted-foreground">Tổng ngày gia hạn</dt><dd className="font-semibold">{detail.max_total_extension_days} ngày</dd></div>
        </dl>
      </div>}
    </AppDrawer>
    <PolicyEditorDialog open={editorOpen} onClose={()=>{if(!busy)setEditorOpen(false);}}
      busy={busy} policy={editing} organizations={data?.organizations??EMPTY_ORGANIZATIONS} onSave={save}/>
    <ConfirmDialog open={confirm!==null} onOpenChange={v=>{if(!v&&!busy){setConfirm(null);setActionError('');}}}
      busy={busy} destructive={confirm?.action==='cancel'}
      title={confirm?.action==='cancel'?'Xác nhận xóa bản nháp':confirm?.action==='reapply'?'Xác nhận áp dụng lại chính sách':'Xác nhận áp dụng chính sách'}
      description={confirm?.action==='cancel'
        ? `Bạn có chắc chắn muốn xóa bản nháp chính sách phiên bản ${confirmingPolicy?.version??'—'}?`
        : confirm?.action==='reapply'
          ? `Bạn có chắc chắn muốn áp dụng lại chính sách phiên bản ${confirmingPolicy?.version??'—'}?`
          : `Bạn có chắc chắn muốn áp dụng chính sách phiên bản ${confirmingPolicy?.version??'—'}?`}
      confirmLabel="Xác nhận" onConfirm={confirmAction}>
      {actionError&&<p role="alert" className="text-sm text-red-600">{actionError}</p>}
    </ConfirmDialog>
  </div>;
}
