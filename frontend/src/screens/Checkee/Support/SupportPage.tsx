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

type Ticket={id:number;school_name:string;subject:string;description:string;status:string;
  forwarded_at:string;checkee_responded_at:string|null;created_at:string;
  activities:{id:number;content:string;created_at:string;author_name:string|null}[]};
type List={data:Ticket[];total:number;page:number;page_size:number};

export function SupportPage({apiBase,token,abilities,onChanged}:RolePageProps){
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.technical_support.handle');
  const [draft,setDraft]=useState('');const [search,setSearch]=useState('');
  const [status,setStatus]=useState('ALL');const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(20);
  const [selected,setSelected]=useState<Ticket|null>(null);
  const [note,setNote]=useState('');const [completed,setCompleted]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const client=useQueryClient();
  const query=useQuery({queryKey:['checkee-support',token,page,pageSize,search,status],
    queryFn:()=>channelRequest<List>(apiBase,token,'/checkee/support-cases?page='+page+'&page_size='+pageSize
      +'&status='+status+'&search='+encodeURIComponent(search)),enabled:!!apiBase&&!!token&&allowed});
  const save=async()=>{
    if(!selected||!note.trim())return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/checkee/support-cases/'+selected.id+'/progress',{
        method:'POST',body:JSON.stringify({content:note.trim(),completed}),
      });
      setSelected(null);setNote('');setCompleted(false);
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
            onClick={()=>{setSelected(x);setNote('');setCompleted(false);setError('');}}/></td>
        </tr>)}</tbody>
      </table></div>
      {query.isLoading&&<p className="p-6 text-sm text-muted-foreground">Đang tải ticket…</p>}
      {query.data?.data.length===0&&<p className="p-6 text-sm text-muted-foreground">Chưa có lỗi phần mềm phù hợp.</p>}
      <AppPagination page={page} pageSize={pageSize} total={query.data?.total??0} showSummary={false}
        disabled={!apiBase||query.isFetching} pageSizeOptions={[10,20,50]}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDrawer open={!!selected} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}} busy={busy}
      title={selected?.subject??'Chi tiết lỗi'} description={selected?.school_name}
      footer={<><AppButton tone="neutral" disabled={busy} onClick={()=>setSelected(null)}>Đóng</AppButton>
        {selected?.status!=='RESOLVED'&&<AppButton busy={busy} disabled={!note.trim()} onClick={()=>void save()}>Gửi phản hồi</AppButton>}</>}>
      {selected&&<div className="space-y-4 text-sm">
        <p className="whitespace-pre-wrap">{selected.description}</p>
        <h3 className="font-semibold">Lịch sử xử lý kỹ thuật</h3>
        {selected.activities.map(a=><div key={a.id} className="rounded-xl border p-3"><p>{a.content}</p>
          <p className="mt-1 text-xs text-muted-foreground">{a.author_name} · {channelDate(a.created_at)}</p></div>)}
        {selected.activities.length===0&&<p className="text-muted-foreground">Chưa có phản hồi kỹ thuật.</p>}
        {selected.status!=='RESOLVED'&&<>
          <label htmlFor="checkee-technical-note" className="block font-medium">Kết quả kiểm tra / hướng khắc phục</label>
          <textarea id="checkee-technical-note" rows={4} maxLength={4000} value={note}
            onChange={e=>setNote(e.target.value)} className="w-full rounded-xl border bg-background p-3"/>
          <label className="flex items-start gap-2"><input type="checkbox" checked={completed} onChange={e=>setCompleted(e.target.checked)}/>
            <span>Đã khắc phục xong kỹ thuật; chuyển kết quả cho CSKH xác nhận lại với trường.</span></label>
        </>}
        {error&&<p role="alert" className="text-destructive">{error}</p>}
      </div>}
    </AppDrawer>
  </div>;
}
