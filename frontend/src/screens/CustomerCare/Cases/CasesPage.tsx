'use client';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Plus,Eye} from 'lucide-react';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AdminListPanel,AdminListToolbar,AdminIconAction,AdminStatusBadge,adminTableClass,adminTableHeadClass,adminTableCellClass} from '@/components/common/admin-list-ui';
import {AppPagination} from '@/components/common/app-pagination';
import {AppDialog} from '@/components/common/dialogs/app-dialog';
import {AppDrawer} from '@/components/common/drawers/app-drawer';
import {AppButton} from '@/components/common/buttons/app-button';
import {channelRequest,channelDate} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';

type Ticket={id:number;contract_id:number;customer_id:number;subject:string;description:string;status:string;
  ticket_type:string;checkee_responded_at:string|null;outcome:string|null;created_at:string;school_name:string;
  activities:{id:number;content:string;activity_type:string;created_at:string;next_follow_up_at:string|null}[]};
type TicketList={data:Ticket[];total:number;page:number;page_size:number};
type School={id:number;school_name:string;contract_code:string};
type SchoolList={data:School[];total:number};
export function CasesPage({apiBase,token,abilities,onChanged}:RolePageProps){
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const [draft,setDraft]=useState('');const [search,setSearch]=useState('');
  const [status,setStatus]=useState('ALL');const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(20);
  const [creating,setCreating]=useState(false);const [schoolSearch,setSchoolSearch]=useState('');
  const [contractId,setContractId]=useState('');const [subject,setSubject]=useState('');const [description,setDescription]=useState('');
  const [selected,setSelected]=useState<Ticket|null>(null);const [progress,setProgress]=useState('');
  const [nextStatus,setNextStatus]=useState('IN_PROGRESS');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const client=useQueryClient();
  const query=useQuery({queryKey:['care-ticket-list',token,page,pageSize,search,status],
    queryFn:()=>channelRequest<TicketList>(apiBase,token,'/care/tickets?page='+page+'&page_size='+pageSize
      +'&status='+status+'&search='+encodeURIComponent(search)),
    enabled:!!apiBase&&!!token&&allowed});
  const schools=useQuery({queryKey:['care-ticket-schools',token,schoolSearch],
    queryFn:()=>channelRequest<SchoolList>(apiBase,token,'/care/schools?page=1&page_size=50&search='+encodeURIComponent(schoolSearch)),
    enabled:!!apiBase&&!!token&&allowed&&creating});
  const reload=async()=>{await Promise.all([client.invalidateQueries({queryKey:['care-ticket-list']}),onChanged()]);};
  const create=async()=>{
    if(!contractId||!subject.trim()||!description.trim())return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/customer-support-cases',{method:'POST',body:JSON.stringify({
        idempotency_key:crypto.randomUUID(),contract_id:Number(contractId),
        subject:subject.trim(),description:description.trim(),
      })});
      setCreating(false);setContractId('');setSubject('');setDescription('');setSchoolSearch('');
      await reload();
    }catch(cause){setError(cause instanceof Error?cause.message:'Không tạo được ticket kỹ thuật.');}
    finally{setBusy(false);}
  };
  const update=async()=>{
    if(!selected||!progress.trim())return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/customer-support-cases/'+selected.id+'/progress',{
        method:'POST',body:JSON.stringify({status:nextStatus,content:progress.trim(),next_follow_up_at:null}),
      });
      setSelected(null);setProgress('');await reload();
    }catch(cause){setError(cause instanceof Error?cause.message:'Không cập nhật được ticket.');}
    finally{setBusy(false);}
  };
  if(!allowed)return <p role="alert">Không có quyền xử lý yêu cầu CSKH.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Ticket lỗi hệ thống"
      description="Chỉ tạo ticket khi xác định lỗi phần mềm. Câu hỏi sử dụng thông thường được ghi nhật ký tại Trường phụ trách."
      actions={<AppButton leadingIcon={<Plus className="size-4"/>} disabled={!apiBase} onClick={()=>{setCreating(true);setError('');}}>Tạo ticket lỗi</AppButton>}/>
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc; kết nối Backend để tạo ticket.</p>}
    {query.error&&<p role="alert" className="rounded-xl border p-4 text-sm text-destructive">{query.error.message}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setStatus('ALL');setPage(1);}}
        placeholder="Tên trường, nội dung lỗi..." searchLabel="Tìm ticket"
        filters={<select aria-label="Lọc trạng thái ticket" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}
          className="h-11 rounded-xl border bg-background px-3">
          <option value="ALL">Tất cả trạng thái</option><option value="OPEN">Mới nhận</option>
          <option value="IN_PROGRESS">Đang xử lý</option><option value="RESOLVED">Hoàn tất</option>
        </select>}/>
      <div className="overflow-x-auto"><table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr>
          <th className={adminTableCellClass}>Trường</th><th className={adminTableCellClass}>Vấn đề</th>
          <th className={adminTableCellClass}>CHECKEE</th><th className={adminTableCellClass}>Trạng thái</th>
          <th className={adminTableCellClass}>Thao tác</th>
        </tr></thead>
        <tbody>{query.data?.data.map(t=><tr key={t.id} className="border-b even:bg-muted/20">
          <td className={adminTableCellClass}>{t.school_name}</td><td className={adminTableCellClass}>{t.subject}</td>
          <td className={adminTableCellClass}>{t.ticket_type==='SYSTEM_ERROR'
            ? t.checkee_responded_at?'Đã hoàn tất kỹ thuật':'Chờ phản hồi':'Ticket lịch sử'}</td>
          <td className={adminTableCellClass}><AdminStatusBadge status={t.status} label={t.status==='OPEN'?'Mới nhận':t.status==='IN_PROGRESS'?'Đang xử lý':'Hoàn tất'}/></td>
          <td className={adminTableCellClass}><AdminIconAction icon={Eye} label={'Xem ticket '+t.id}
            onClick={()=>{setSelected(t);setProgress('');setNextStatus(t.status==='OPEN'?'IN_PROGRESS':t.status);setError('');}}/></td>
        </tr>)}</tbody>
      </table></div>
      {query.isLoading&&<p className="p-6 text-sm text-muted-foreground">Đang tải ticket…</p>}
      {query.data?.data.length===0&&<p className="p-6 text-sm text-muted-foreground">Chưa có ticket phù hợp.</p>}
      <AppPagination page={page} pageSize={pageSize} total={query.data?.total??0} showSummary={false}
        disabled={!apiBase||query.isFetching} pageSizeOptions={[10,20,50]}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDialog open={creating} onOpenChange={open=>{if(!busy)setCreating(open);}} title="Gửi lỗi phần mềm cho CHECKEE"
      description="CSKH đã xác định đây là lỗi hệ thống, không phải thao tác sử dụng thông thường." busy={busy}
      footer={<><AppButton tone="neutral" disabled={busy} onClick={()=>setCreating(false)}>Hủy</AppButton>
        <AppButton busy={busy} disabled={!contractId||!subject.trim()||!description.trim()} onClick={()=>void create()}>Tạo và gửi CHECKEE</AppButton></>}>
      <div className="space-y-3 text-sm">
        <label htmlFor="ticket-school-search" className="block font-medium">Tìm trường phụ trách</label>
        <input id="ticket-school-search" className="w-full rounded-xl border bg-background p-3" placeholder="Tên trường / mã hợp đồng"
          value={schoolSearch} onChange={e=>{setSchoolSearch(e.target.value);setContractId('');}}/>
        <label className="block font-medium" htmlFor="ticket-contract">Chọn hợp đồng</label>
        <select id="ticket-contract" className="w-full rounded-xl border bg-background p-3"
          value={contractId} onChange={e=>setContractId(e.target.value)}>
          <option value="">Chọn trường được phân công</option>
          {schools.data?.data.map(x=><option key={x.id} value={x.id}>{x.school_name} · {x.contract_code}</option>)}
        </select>
        <label htmlFor="ticket-subject" className="block font-medium">Tiêu đề lỗi</label>
        <input id="ticket-subject" maxLength={190} value={subject} onChange={e=>setSubject(e.target.value)}
          className="w-full rounded-xl border bg-background p-3"/>
        <label htmlFor="ticket-description" className="block font-medium">Mô tả lỗi và các bước tái hiện</label>
        <textarea id="ticket-description" rows={4} maxLength={4000} value={description}
          onChange={e=>setDescription(e.target.value)} className="w-full rounded-xl border bg-background p-3"/>
        {error&&<p role="alert" className="text-destructive">{error}</p>}
      </div>
    </AppDialog>
    <AppDrawer open={!!selected} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}} busy={busy}
      title={selected?.subject??'Chi tiết ticket'} description={selected?.school_name}
      footer={<><AppButton tone="neutral" disabled={busy} onClick={()=>setSelected(null)}>Đóng</AppButton>
        {selected?.status!=='RESOLVED'&&<AppButton busy={busy} disabled={!progress.trim()} onClick={()=>void update()}>Cập nhật</AppButton>}</>}>
      {selected&&<div className="space-y-4 text-sm">
        <p className="whitespace-pre-wrap">{selected.description}</p>
        <p className="text-xs text-muted-foreground">{selected.ticket_type==='SYSTEM_ERROR'
          ? selected.checkee_responded_at?'CHECKEE đã xác nhận xử lý xong kỹ thuật.':'Đang chờ CHECKEE hoàn tất xử lý kỹ thuật.'
          :'Yêu cầu hỗ trợ lịch sử.'}</p>
        <h3 className="font-semibold">Lịch sử xử lý</h3>
        {selected.activities.map(a=><div key={a.id} className="rounded-xl border p-3">
          <p>{a.activity_type==='CHECKEE_SUPPORT'?'CHECKEE: ':''}{a.content}</p>
          <p className="mt-1 text-xs text-muted-foreground">{channelDate(a.created_at)}</p>
        </div>)}
        {selected.status!=='RESOLVED'&&<>
          <label htmlFor="ticket-next-status" className="block font-medium">Trạng thái cập nhật</label>
          <select id="ticket-next-status" className="w-full rounded-xl border bg-background p-3" value={nextStatus}
            onChange={e=>setNextStatus(e.target.value)}>
            <option value="IN_PROGRESS">Đang xử lý</option>
            {(selected.ticket_type!=='SYSTEM_ERROR'||selected.checkee_responded_at)&&<option value="RESOLVED">Hoàn tất (đã xác nhận với trường)</option>}
          </select>
          <label className="block font-medium" htmlFor="ticket-progress">Tiến độ / kết quả xác nhận với trường</label>
          <textarea id="ticket-progress" rows={3} maxLength={4000} value={progress}
            onChange={e=>setProgress(e.target.value)} className="w-full rounded-xl border bg-background p-3"/>
        </>}
        {error&&<p role="alert" className="text-destructive">{error}</p>}
      </div>}
    </AppDrawer>
  </div>;
}
