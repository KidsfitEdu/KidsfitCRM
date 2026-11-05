'use client';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Eye} from 'lucide-react';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AdminListPanel,AdminListToolbar,AdminIconAction,AdminStatusBadge,adminTableClass,adminTableHeadClass,adminTableCellClass} from '@/components/common/admin-list-ui';
import {AppPagination} from '@/components/common/app-pagination';
import {AppDrawer} from '@/components/common/drawers/app-drawer';
import {AppButton} from '@/components/common/buttons/app-button';
import {channelRequest,channelDate} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';
import {SupportTicketSummary,SupportTicketTimeline} from '@/components/common/support-ticket-detail';

type Ticket={id:number;school_name:string;subject:string;description:string;status:string;
  forwarded_at:string;checkee_responded_at:string|null;created_at:string;
  activities:{id:number;content:string;created_at:string;author_name:string|null;author_role:string;activity_type:string}[]};
type List={data:Ticket[];total:number;page:number;page_size:number};

export function SupportPage({apiBase,token,abilities,onChanged}:RolePageProps){
  const allowed=!apiBase||abilities.includes('*')||abilities.includes('channel_sales.school.technical_support.handle');
  const [draft,setDraft]=useState('');const [search,setSearch]=useState('');
  const [status,setStatus]=useState('ALL');const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(20);
  const [selected,setSelected]=useState<Ticket|null>(null);
  const [note,setNote]=useState('');const [technicalStatus,setTechnicalStatus]=useState<'IN_PROGRESS'|'COMPLETED'>('IN_PROGRESS');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const client=useQueryClient();
  const query=useQuery({queryKey:['checkee-support',token,page,pageSize,search,status],
    queryFn:()=>channelRequest<List>(apiBase,token,'/checkee/support-cases?page='+page+'&page_size='+pageSize
      +'&status='+status+'&search='+encodeURIComponent(search)),enabled:!!apiBase&&!!token&&allowed});
  const save=async()=>{
    if(!selected||busy||!note.trim()||note.trim().length>4000||selected.checkee_responded_at||selected.status==='RESOLVED')return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/checkee/support-cases/'+selected.id+'/progress',{
        method:'POST',body:JSON.stringify({content:note.trim(),completed:technicalStatus==='COMPLETED'}),
      });
      setSelected(null);setNote('');setTechnicalStatus('IN_PROGRESS');
      await Promise.all([client.invalidateQueries({queryKey:['checkee-support']}),onChanged()]);
    }catch(cause){setError(cause instanceof Error?cause.message:'Không thể ghi phản hồi kỹ thuật.');}
    finally{setBusy(false);}
  };
  if(!allowed)return <p role="alert">Không có quyền tiếp nhận lỗi phần mềm.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CHECKEE / KIDSFIT CRM" title="Hỗ trợ kỹ thuật"
      description="Chỉ các ticket lỗi phần mềm CSKH đã chuyển. CHECKEE phản hồi kỹ thuật, CSKH xác nhận và đóng ticket."/>
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc. Kết nối Backend để xử lý lỗi.</p>}
    {query.error&&<p role="alert" className="rounded-xl border p-4 text-sm text-destructive">{query.error.message}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setStatus('ALL');setPage(1);}}
        placeholder="Tên trường, nội dung lỗi..." searchLabel="Tìm lỗi phần mềm"
        filters={<select aria-label="Trạng thái ticket kỹ thuật" className="h-11 rounded-xl border bg-background px-3"
          value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
          <option value="ALL">Tất cả trạng thái</option><option value="OPEN">Mới nhận</option>
          <option value="IN_PROGRESS">Đang xử lý</option><option value="RESOLVED">CSKH đã đóng</option>
        </select>}/>
      <div className="overflow-x-auto"><table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr>
          <th className={adminTableCellClass}>Trường</th><th className={adminTableCellClass}>Lỗi phần mềm</th>
          <th className={adminTableCellClass}>Ngày chuyển</th><th className={adminTableCellClass}>Trạng thái</th>
          <th className={adminTableCellClass}>Thao tác</th>
        </tr></thead>
        <tbody>{query.data?.data.map(x=><tr key={x.id} className="border-b even:bg-muted/20">
          <td className={adminTableCellClass}>{x.school_name}</td><td className={adminTableCellClass}>{x.subject}</td>
          <td className={adminTableCellClass}>{channelDate(x.forwarded_at)}</td>
          <td className={adminTableCellClass}><AdminStatusBadge status={x.status} label={x.status==='RESOLVED'
            ?'CSKH đã đóng':x.checkee_responded_at?'Đã phản hồi kỹ thuật':x.status==='OPEN'?'Mới nhận':'Đang xử lý'}/></td>
          <td className={adminTableCellClass}><AdminIconAction icon={Eye} label={'Xem ticket '+x.id}
            onClick={()=>{setSelected(x);setNote('');setTechnicalStatus('IN_PROGRESS');setError('');}}/></td>
        </tr>)}</tbody>
      </table></div>
      {query.isLoading&&<p className="p-6 text-sm text-muted-foreground">Đang tải ticket…</p>}
      {query.data?.data.length===0&&<p className="p-6 text-sm text-muted-foreground">Chưa có lỗi phần mềm phù hợp.</p>}
      <AppPagination page={page} pageSize={pageSize} total={query.data?.total??0} showSummary={false}
        disabled={!apiBase||query.isFetching} pageSizeOptions={[10,20,50]}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDrawer open={!!selected} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}} busy={busy}
      title="Xử lý lỗi kỹ thuật" description={selected?.school_name}
      footer={<><AppButton tone="neutral" disabled={busy} onClick={()=>setSelected(null)}>Đóng</AppButton>
        {selected?.status!=='RESOLVED'&&!selected?.checkee_responded_at&&
          <AppButton busy={busy} disabled={busy||!note.trim()||note.trim().length>4000}
            onClick={()=>void save()}>Lưu kết quả xử lý</AppButton>}</>}>
      {selected&&<div className="space-y-5 text-sm">
        <SupportTicketSummary subject={selected.subject} description={selected.description}
          statusLabel={selected.status==='RESOLVED'?'CSKH đã đóng'
            :selected.checkee_responded_at?'Chờ CSKH xác nhận'
            :selected.status==='OPEN'?'Mới nhận':'Đang xử lý'}/>
        <SupportTicketTimeline entries={selected.activities} emptyText="Chưa có phản hồi kỹ thuật."/>
        {selected.status!=='RESOLVED'&&!selected.checkee_responded_at&&<section className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">Cập nhật xử lý kỹ thuật</h3>
          <fieldset className="space-y-2">
            <legend className="font-medium">Trạng thái xử lý *</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="technical-state" value="IN_PROGRESS"
                checked={technicalStatus==='IN_PROGRESS'} disabled={busy}
                onChange={()=>setTechnicalStatus('IN_PROGRESS')}/> Đang xử lý
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="technical-state" value="COMPLETED"
                checked={technicalStatus==='COMPLETED'} disabled={busy}
                onChange={()=>setTechnicalStatus('COMPLETED')}/> Hoàn tất kỹ thuật
            </label>
          </fieldset>
          <label htmlFor="checkee-technical-note" className="block font-medium">
            Kết quả kiểm tra / hướng khắc phục *
          </label>
          <textarea id="checkee-technical-note" rows={4} maxLength={4000} value={note}
            aria-invalid={note.length>4000} disabled={busy}
            onChange={e=>{setNote(e.target.value);setError('');}}
            placeholder="Nhập nguyên nhân, kết quả kiểm tra và hướng khắc phục..."
            className="w-full rounded-xl border bg-background p-3"/>
          <p className="text-xs text-muted-foreground">{note.length}/4.000 ký tự</p>
          {!note.trim()&&error&&<p role="alert" className="text-xs text-destructive">Vui lòng nhập kết quả xử lý.</p>}
        </section>}
        {selected.checkee_responded_at&&selected.status!=='RESOLVED'&&
          <p className="rounded-xl border bg-muted/20 p-3">Đã hoàn tất kỹ thuật. Chờ CSKH xác nhận với nhà trường.</p>}
        {error&&<p role="alert" className="text-destructive">{error}</p>}
      </div>}
    </AppDrawer>
  </div>;
}
