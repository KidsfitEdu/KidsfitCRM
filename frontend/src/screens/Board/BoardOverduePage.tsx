'use client';

import { useState } from 'react';
import { Eye, ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AdminListPanel, AdminListToolbar, AdminStatusBadge, AdminIconAction, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { AppSelect } from '@/components/common/app-select';
import { AppPagination } from '@/components/common/app-pagination';
import { SchoolActionDialog } from '@/components/crm/schools/school-action-dialog';
import type { SchoolAction } from '@/components/crm/schools/school-action-form';
import { channelRequest } from '@/lib/channel-operations';
import { workflowDate, type SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

type Proposal = SchoolOperationsWorkspace['proposals'][number];
type Extension = SchoolOperationsWorkspace['extensions'][number];
type Overdue = {kind:'proposal';record:Proposal}|{kind:'extension';record:Extension};
const reason = {name:'reason',label:'Căn cứ xử lý',type:'textarea' as const};
const dateField = (name:string,label:string) => ({name,label,type:'datetime-local' as const});

export function BoardOverduePage({apiBase,token,abilities,onChanged}:RolePageProps) {
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [kind,setKind]=useState<'all'|'proposal'|'extension'>('all');
  const [selected,setSelected]=useState<Overdue|null>(null);
  const [action,setAction]=useState<SchoolAction|null>(null);
  const permitted=abilities.includes('*')||abilities.includes('channel_sales.school.escalation.resolve');
  const connected=Boolean(apiBase&&token&&permitted);
  const query=useQuery({
    queryKey:['board','overdue',apiBase,page,pageSize,search],
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,
      '/school-operations?overdue_only=true&page='+page+'&page_size='+pageSize+'&search='+encodeURIComponent(search)),
    enabled:connected,
  });
  const data=query.data;
  const proposals=(data?.proposals??[]).filter(x=>x.is_overdue&&x.status.startsWith('PENDING_')).map(record=>({kind:'proposal' as const,record}));
  const extensions=(data?.extensions??[]).filter(x=>x.is_overdue&&x.status==='PENDING').map(record=>({kind:'extension' as const,record}));
  const rows=[...(kind!=='extension'?proposals:[]),...(kind!=='proposal'?extensions:[])]
    .sort((a,b)=>new Date(a.record.review_due_at).getTime()-new Date(b.record.review_due_at).getTime());
  const proposalTotal = data?.pagination?.totals.proposals ?? 0;
  const extensionTotal = data?.pagination?.totals.extensions ?? 0;
  // The workspace paginates each queue independently using the same page index.
  const total = kind==='proposal' ? proposalTotal : kind==='extension' ? extensionTotal : Math.max(proposalTotal,extensionTotal);
  const openProposal=(r:Proposal,approve:boolean)=>setAction({
    title:approve?'Chuyển tiếp đề xuất quá hạn':'Từ chối đề xuất quá hạn',
    description:'Thao tác ngoại lệ được kiểm tra trên máy chủ và ghi lịch sử.',
    path:'/school-proposals/'+r.id+'/manager-review',
    fields:[reason],preset:{approve,duplicate_reviewed:false},
  });
  const openExtension=(r:Extension,approve:boolean)=>setAction({
    title:approve?'Phê duyệt gia hạn quá hạn':'Từ chối gia hạn quá hạn',
    description:'Quyền tiếp cận và thời gian phê duyệt phải còn hợp lệ theo chính sách.',
    path:'/school-extensions/'+r.id+'/review',
    fields:approve?[reason,dateField('approved_until','Gia hạn đến'),dateField('next_review_at','Ngày rà soát tiếp theo')]:[reason],
    preset:{approve},
  });
  const save=async (command:{path:string;method?:string;body:Record<string,unknown>})=>{
    await channelRequest(apiBase,token,command.path,{method:command.method??'POST',body:JSON.stringify(command.body)});
    setAction(null);
    await query.refetch();
    await onChanged();
  };
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Hồ sơ quá hạn"
      description="Theo dõi đề xuất và gia hạn quá hạn cần xử lý ngoại lệ theo phân quyền."/>
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setKind('all');setPage(1);}}
        placeholder="Tên trường, mã trường, người phụ trách..." searchLabel="Tìm hồ sơ quá hạn"
        filters={<AppSelect ariaLabel="Lọc loại hồ sơ" className="w-full sm:w-48" value={kind}
          options={[{value:'all',label:'Tất cả hồ sơ'},{value:'proposal',label:'Đề xuất trường'},
            {value:'extension',label:'Gia hạn tiếp cận'}]}
          onValueChange={next=>{setKind(next as typeof kind);setPage(1);}}/>}/>
      {query.error&&<p role="alert" className="p-4 text-sm text-red-600">{query.error instanceof Error?query.error.message:'Không tải được hồ sơ.'}</p>}
      {!connected&&<p className="p-5 text-sm text-muted-foreground">Chưa kết nối API hoặc chưa có quyền giám sát quá hạn.</p>}
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Loại</th><th className="px-5 py-4">Người phụ trách</th><th className="px-5 py-4">Hạn xử lý</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
          <tbody>{rows.map(x=><tr key={x.kind+'-'+x.record.id} className="border-b">
            <td className="px-5 py-4 font-medium">{x.kind==='proposal'?x.record.name:x.record.school_name}
              {x.kind==='proposal'&&<p className="text-xs text-muted-foreground">{x.record.school_code}</p>}</td>
            <td className="px-5 py-4">{x.kind==='proposal'?'Đề xuất':'Gia hạn'}</td>
            <td className="px-5 py-4">{x.kind==='proposal'?x.record.manager_name:x.record.requested_by}</td>
            <td className="px-5 py-4 tabular-nums">
              <span className="block">{workflowDate(x.record.review_due_at)}</span>
              <span className="mt-1 inline-block"><AdminStatusBadge status="SUSPENDED" label="Quá hạn"/></span>
            </td>
            <td className="px-5 py-4"><div className="flex justify-end gap-2">
              <AdminIconAction icon={Eye} label="Xem hồ sơ quá hạn" onClick={()=>setSelected(x)}/>
              {x.kind==='proposal'&&x.record.can_manager_review&&<AdminIconAction icon={ClipboardCheck} tone="blue" label="Xử lý đề xuất quá hạn" onClick={()=>openProposal(x.record,true)}/>}
              {x.kind==='extension'&&x.record.can_review&&<AdminIconAction icon={ClipboardCheck} tone="blue" label="Xử lý gia hạn quá hạn" onClick={()=>openExtension(x.record,true)}/>}
            </div></td>
          </tr>)}</tbody>
        </table>
        {connected&&!query.isFetching&&!rows.length&&<p className="p-8 text-center text-sm text-muted-foreground">Không có hồ sơ quá hạn trong trang dữ liệu này.</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={total} disabled={query.isFetching} onPageChange={setPage}
        pageSizeOptions={[10,20,50,100]} onPageSizeChange={size=>{setPageSize(size);setPage(1);}} showSummary={false}/>
    </AdminListPanel>
    <AppDrawer open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}} title="Chi tiết hồ sơ quá hạn">
      {selected&&<div className="space-y-4 text-sm">
        <p className="text-lg font-semibold">{selected.kind==='proposal'?selected.record.name:selected.record.school_name}</p>
        <p>Loại: {selected.kind==='proposal'?'Đề xuất trường':'Gia hạn tiếp cận'}</p>
        <p>Hạn xử lý: {workflowDate(selected.record.review_due_at)}</p>
        <p className="whitespace-pre-wrap rounded-xl border p-4">{selected.kind==='proposal'?selected.record.reason:selected.record.progress}</p>
        {selected.kind==='proposal'&&selected.record.can_manager_review&&<div className="flex flex-wrap gap-2">
          <AdminIconAction icon={CheckCircle2} label="Chuyển tiếp đề xuất" onClick={()=>{openProposal(selected.record as Proposal,true);setSelected(null);}}/>
          <AdminIconAction icon={XCircle} tone="red" label="Từ chối đề xuất" onClick={()=>{openProposal(selected.record as Proposal,false);setSelected(null);}}/>
        </div>}
        {selected.kind==='extension'&&selected.record.can_review&&<div className="flex flex-wrap gap-2">
          <AdminIconAction icon={CheckCircle2} label="Phê duyệt gia hạn" onClick={()=>{openExtension(selected.record as Extension,true);setSelected(null);}}/>
          <AdminIconAction icon={XCircle} tone="red" label="Từ chối gia hạn" onClick={()=>{openExtension(selected.record as Extension,false);setSelected(null);}}/>
        </div>}
      </div>}
    </AppDrawer>
    <SchoolActionDialog action={action} onClose={()=>setAction(null)} save={save}/>
  </div>;
}
