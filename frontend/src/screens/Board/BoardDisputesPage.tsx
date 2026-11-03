'use client';

import { useState } from 'react';
import { Eye, Scale, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AdminIconAction, AdminListPanel, AdminListToolbar, AdminStatusBadge, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { AppPagination } from '@/components/common/app-pagination';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { SchoolActionDialog } from '@/components/crm/schools/school-action-dialog';
import type { SchoolAction } from '@/components/crm/schools/school-action-form';
import { channelRequest } from '@/lib/channel-operations';
import { workflowLabels, type SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

type Dispute = SchoolOperationsWorkspace['disputes'][number];

export function BoardDisputesPage({apiBase,token,abilities,onChanged}:RolePageProps) {
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState<'OPEN'|'ALL'|'RESOLVED'>('OPEN');
  const [selected,setSelected]=useState<Dispute|null>(null);
  const [action,setAction]=useState<SchoolAction|null>(null);
  const permitted=abilities.includes('*')||abilities.includes('channel_sales.school.dispute.resolve');
  const connected=Boolean(apiBase&&token&&permitted);
  const query=useQuery({
    queryKey:['board','disputes',apiBase,page,pageSize,status,search],
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,
      '/school-operations?page='+page+'&page_size='+pageSize+'&search='+encodeURIComponent(search)+(status==='ALL'?'':'&dispute_status='+status)),
    enabled:connected,
  });
  const data=query.data;
  const rows=(data?.disputes??[]).filter(x=>status==='ALL'||x.status===status);
  const organizationName=(id:number)=>data?.organizations.find(x=>x.id===id)?.name??'—';
  const openDecision=(x:Dispute)=>setAction({
    title:'Ghi kết luận tranh chấp',
    description:'Kết luận và căn cứ được lưu vào lịch sử; không tự động chuyển quyền sở hữu hoặc sửa hoa hồng.',
    path:'/school-disputes/'+x.id+'/resolve',
    fields:[
      {name:'decision',label:'Kết luận',type:'select',options:[
        {value:'UPHOLD_CURRENT_RIGHTS',label:'Giữ quyền hợp lệ hiện tại'},
        {value:'REJECT_CLAIM',label:'Bác yêu cầu tranh chấp'},
        {value:'RESOLVED',label:'Đã giải quyết'},
      ]},
      {name:'reason',label:'Căn cứ kết luận',type:'textarea'},
    ],
  });
  const save=async (command:{path:string;method?:string;body:Record<string,unknown>})=>{
    await channelRequest(apiBase,token,command.path,{method:command.method??'POST',body:JSON.stringify(command.body)});
    setAction(null);setSelected(null);await query.refetch();await onChanged();
  };
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Tranh chấp"
      description="Theo dõi hồ sơ, bằng chứng và ghi kết luận trong phạm vi được phân quyền."/>
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setStatus('OPEN');setPage(1);}}
        placeholder="Tên trường, nội dung tranh chấp..." searchLabel="Tìm tranh chấp"
        filters={<AppNativeSelect aria-label="Lọc trạng thái tranh chấp" containerClassName="w-full sm:w-48" value={status}
          onChange={e=>{setStatus(e.target.value as typeof status);setPage(1);}}>
          <option value="OPEN">Đang mở</option>
          <option value="RESOLVED">Đã xử lý</option>
          <option value="ALL">Tất cả trạng thái</option>
        </AppNativeSelect>}/>
      {query.error&&<p role="alert" className="p-4 text-sm text-red-600">{query.error instanceof Error?query.error.message:'Không tải được tranh chấp.'}</p>}
      {!connected&&<p className="p-5 text-sm text-muted-foreground">Chưa kết nối API hoặc chưa có quyền xem tranh chấp.</p>}
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Người phản ánh</th><th className="px-5 py-4">Tổ chức</th><th className="px-5 py-4">Nội dung</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
          <tbody>{rows.map(x=><tr key={x.id} className="border-b">
            <td className="px-5 py-4 font-medium">{x.school_name}</td>
            <td className="px-5 py-4">{x.opened_by}</td>
            <td className="px-5 py-4">{organizationName(x.organization_id)}</td>
            <td className="max-w-72 truncate px-5 py-4" title={x.reason}>{x.reason}</td>
            <td className="px-5 py-4"><AdminStatusBadge status={x.status} label={workflowLabels[x.status]??x.status}/></td>
            <td className="px-5 py-4"><div className="flex justify-end gap-2">
              <AdminIconAction icon={Eye} label="Xem chi tiết tranh chấp" onClick={()=>setSelected(x)}/>
              {x.can_resolve&&<AdminIconAction icon={Scale} tone="blue" label="Ghi kết luận tranh chấp" onClick={()=>openDecision(x)}/>}
            </div></td>
          </tr>)}</tbody>
        </table>
        {connected&&!query.isFetching&&!rows.length&&<p className="p-8 text-center text-sm text-muted-foreground">Không có hồ sơ phù hợp trong trang dữ liệu này.</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={data?.pagination?.totals.disputes??0}
        pageSizeOptions={[10,20,50,100]} onPageSizeChange={size=>{setPageSize(size);setPage(1);}}
        showSummary={false} disabled={query.isFetching} onPageChange={setPage}/>
    </AdminListPanel>
    <p className="text-xs text-muted-foreground">Trạng thái được lọc trên máy chủ; phân trang phản ánh số hồ sơ thuộc trạng thái đã chọn.</p>
    <AppDrawer open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}} title="Chi tiết tranh chấp">
      {selected&&<div className="space-y-4 text-sm">
        <h3 className="text-lg font-semibold">{selected.school_name}</h3>
        <p>Người phản ánh: {selected.opened_by}</p>
        <p>Tổ chức: {organizationName(selected.organization_id)}</p>
        <div className="space-y-1 rounded-xl border p-4"><p className="font-semibold">Nội dung tranh chấp</p><p className="whitespace-pre-wrap">{selected.reason}</p></div>
        <div className="space-y-1 rounded-xl border p-4"><p className="font-semibold">Tham chiếu bằng chứng</p><p className="break-all">{selected.evidence_reference||'Chưa cập nhật'}</p></div>
        {selected.decision&&<div className="space-y-1 rounded-xl border p-4"><p className="font-semibold">Kết luận</p><p>{workflowLabels[selected.decision]??selected.decision}</p><p>{selected.decision_reason}</p></div>}
        {selected.can_resolve&&<AdminIconAction icon={CheckCircle2} tone="blue" label="Ghi kết luận tranh chấp" onClick={()=>{openDecision(selected);setSelected(null);}}/>}
      </div>}
    </AppDrawer>
    <SchoolActionDialog action={action} onClose={()=>setAction(null)} save={save}/>
  </div>;
}
