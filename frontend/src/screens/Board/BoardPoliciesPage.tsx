'use client';

import { useState } from 'react';
import { Eye, Pencil, CheckCircle2, Trash2, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { PolicyEditorDialog, type PolicyForm } from './PolicyEditorDialog';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

const EMPTY_ORGANIZATIONS: SchoolOperationsWorkspace['organizations'] = [];

export function BoardPoliciesPage({apiBase,token,abilities}:RolePageProps) {
  const [organization,setOrganization]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [detailId,setDetailId]=useState<number|null>(null);
  const [editingId,setEditingId]=useState<number|null>(null);
  const [editorOpen,setEditorOpen]=useState(false);
  const [confirm,setConfirm]=useState<{id:number;action:'activate'|'cancel'}|null>(null);
  const [decision,setDecision]=useState('');
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
  const policies=(data?.policies??[]).filter(p=>(organization==='ALL'||String(p.organization_id)===organization)
      && [data?.organizations.find(o=>o.id===p.organization_id)?.name??'',String(p.version),p.decision_reference??'']
        .some(value=>value.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))))
    .sort((a,b)=>a.organization_id-b.organization_id||b.version-a.version);
  const orgName=(id:number)=>data?.organizations.find(x=>x.id===id)?.name??String(id);
  const visiblePolicies=policies.slice((page-1)*pageSize,page*pageSize);
  const detail=(data?.policies??[]).find(p=>p.id===detailId);
  const editing=(data?.policies??[]).find(p=>p.id===editingId)??null;
  const write=async (path:string,method:'POST'|'PATCH',body:unknown)=>{
    setActionError('');setBusy(true);
    try{
      await channelRequest(apiBase,token,path,{method,body:JSON.stringify(body)});
      setEditorOpen(false);setEditingId(null);setConfirm(null);setDecision('');
      await query.refetch();
    }catch(error){setActionError(error instanceof Error?error.message:'Không thể cập nhật chính sách.');}
    finally{setBusy(false);}
  };
  const save=(form:PolicyForm)=>{
    const payload={
      manager_review_hours:form.manager_review_hours,admin_review_hours:form.admin_review_hours,
      invitation_hours:form.invitation_hours,max_extension_days:form.max_extension_days,
      max_extension_count:form.max_extension_count,max_total_extension_days:form.max_total_extension_days,
      decision_reference:form.decision_reference.trim(),
    };
    if(editingId!==null)void write('/school-workflow-policies/'+editingId+'/draft','PATCH',payload);
    else void write('/school-workflow-policies','POST',{...payload,organization_id:form.organization_id,activate:false});
  };
  const confirmAction=()=>{
    if(!confirm)return;
    if(!decision.trim()){setActionError('Vui lòng nhập căn cứ hoặc lý do.');return;}
    void write('/school-workflow-policies/'+confirm.id+'/'+confirm.action,'POST',
      confirm.action==='activate'?{decision_reference:decision.trim()}:{reason:decision.trim()});
  };
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Chính sách vận hành"
      description="Quản lý phiên bản chính sách và thời hạn áp dụng."
      actions={canManage&&<AppButton leadingIcon={<Plus className="size-4"/>}
        onClick={()=>{setEditingId(null);setActionError('');setEditorOpen(true);}}>Thêm mới</AppButton>}/>
    {!connected&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Chưa kết nối API hoặc chưa đủ quyền xem chính sách.</p>}
    {actionError&&<p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
    {query.error&&<p className="rounded-xl border border-red-300 p-4 text-sm text-red-600" role="alert">{query.error instanceof Error?query.error.message:'Không tải được chính sách.'}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setOrganization('ALL');setPage(1);}}
        searchLabel="Tìm chính sách" placeholder="Tên tổ chức, phiên bản, căn cứ..."
        filters={<AppNativeSelect aria-label="Lọc tổ chức" containerClassName="w-full sm:w-56"
          value={organization} onChange={e=>{setOrganization(e.target.value);setPage(1);}}>
          <option value="ALL">Tất cả tổ chức</option>
          {(data?.organizations??[]).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </AppNativeSelect>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Tổ chức</th><th className="px-5 py-4">Phiên bản</th><th className="px-5 py-4">Thời hạn xử lý</th><th className="px-5 py-4">Gia hạn</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4">Căn cứ quyết định</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
          <tbody>{visiblePolicies.map(p=><tr className="border-b" key={p.id}>
            <td className="px-5 py-4 font-medium">{orgName(p.organization_id)}</td>
            <td className="px-5 py-4">{p.version}</td>
            <td className="px-5 py-4">Quản lý {p.manager_review_hours}h · Admin {p.admin_review_hours}h · Phân bổ {p.invitation_hours}h</td>
            <td className="px-5 py-4">{p.max_extension_days} ngày/lần · {p.max_extension_count} lần</td>
            <td className="px-5 py-4"><AdminStatusBadge status={p.status} label={p.status==='ACTIVE'?'Đang áp dụng':p.status==='DRAFT'?'Bản nháp':p.status==='CANCELLED'?'Đã hủy':'Đã thay phiên bản'}/></td>
            <td className="break-words px-5 py-4">{p.decision_reference||'Chưa cập nhật'}</td>
            <td className="px-5 py-4 text-right"><div className="flex items-center justify-end gap-2">
              <AdminIconAction icon={Eye} label="Xem chi tiết chính sách" onClick={()=>setDetailId(p.id)}/>
              {canManage&&p.status==='DRAFT'&&<>
                <AdminIconAction icon={Pencil} tone="blue" label="Sửa bản nháp chính sách"
                  onClick={()=>{setEditingId(p.id);setActionError('');setEditorOpen(true);}}/>
                <AdminIconAction icon={CheckCircle2} label="Kích hoạt chính sách"
                  onClick={()=>{setConfirm({id:p.id,action:'activate'});setDecision(p.decision_reference??'');setActionError('');}}/>
                <AdminIconAction icon={Trash2} tone="red" label="Hủy bản nháp chính sách"
                  onClick={()=>{setConfirm({id:p.id,action:'cancel'});setDecision('');setActionError('');}}/>
              </>}
              </div></td>
          </tr>)}</tbody>
        </table>
        {connected&&!query.isFetching&&!policies.length&&<p className="p-7 text-center text-sm text-muted-foreground">Không có phiên bản chính sách phù hợp trong trang này.</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={policies.length}
        onPageChange={setPage} pageSizeOptions={[10,20,50,100]}
        onPageSizeChange={size=>{setPageSize(size);setPage(1);}}
        disabled={query.isFetching} showSummary={false}/>
    </AdminListPanel>
    <p className="text-xs text-muted-foreground">Tìm kiếm và phân trang áp dụng trên tối đa 100 phiên bản mới nhất do API cung cấp, không phải toàn bộ lịch sử.</p>
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
        <section className="rounded-xl border p-4"><h4 className="font-semibold">Căn cứ quyết định</h4>
          <p className="mt-2 whitespace-pre-wrap">{detail.decision_reference||'Chưa cập nhật'}</p>
        </section>
      </div>}
    </AppDrawer>
    <PolicyEditorDialog open={editorOpen} onClose={()=>{if(!busy)setEditorOpen(false);}}
      busy={busy} policy={editing} organizations={data?.organizations??EMPTY_ORGANIZATIONS} onSave={save}/>
    <ConfirmDialog open={confirm!==null} onOpenChange={v=>{if(!v&&!busy)setConfirm(null);}}
      busy={busy} destructive={confirm?.action==='cancel'}
      title={confirm?.action==='activate'?'Xác nhận kích hoạt chính sách':'Xác nhận hủy bản nháp'}
      confirmLabel="Xác nhận" onConfirm={confirmAction}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="board-policy-action-reason">
          {confirm?.action==='activate'?'Căn cứ kích hoạt *':'Lý do hủy *'}
        </label>
        <Input id="board-policy-action-reason" value={decision} maxLength={confirm?.action==='activate'?120:2000}
          onChange={e=>setDecision(e.target.value)}/>
        {actionError&&<p role="alert" className="text-sm text-red-600">{actionError}</p>}
      </div>
    </ConfirmDialog>
  </div>;
}
