'use client';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Eye,PhoneCall,TicketPlus} from 'lucide-react';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AdminListPanel,AdminListToolbar,AdminIconAction,adminTableClass,adminTableHeadClass,adminTableCellClass} from '@/components/common/admin-list-ui';
import {AppPagination} from '@/components/common/app-pagination';
import {AppDrawer} from '@/components/common/drawers/app-drawer';
import {AppButton} from '@/components/common/buttons/app-button';
import {channelRequest,channelDate} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';

type School={id:number;customer_id:number;contract_code:string;status:string;verified_at:string|null;
  school_name:string;contact_name:string|null;phone:string|null;email:string|null;open_tickets:number;last_support_at:string|null};
type List={data:School[];total:number;page:number;page_size:number};
type Detail={data:School&{address:string|null;contact_position:string|null};
  calls:{id:number;activity_type:string;support_case_id:number|null;content:string;created_at:string;next_follow_up_at:string|null;user_name:string|null}[];
  tickets:{id:number;subject:string;ticket_type:string;status:string;checkee_responded_at:string|null;created_at:string}[];
  handovers:{id:number;reason:string;created_at:string;assigned_name:string|null;assigned_by:string|null}[]};

export function CustomersPage({apiBase,token,abilities,onChanged,onSalesNavigate}:RolePageProps){
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const [searchDraft,setSearchDraft]=useState('');const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(20);
  const [selected,setSelected]=useState<School|null>(null);
  const [note,setNote]=useState('');const [nextAt,setNextAt]=useState('');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const client=useQueryClient();
  const query=useQuery({queryKey:['care-schools',token,page,pageSize,search],
    queryFn:()=>channelRequest<List>(apiBase,token,'/care/schools?page='+page+'&page_size='+pageSize+'&search='+encodeURIComponent(search)),
    enabled:!!apiBase&&!!token&&allowed});
  const details=useQuery({queryKey:['care-school-detail',token,selected?.id],
    queryFn:()=>channelRequest<Detail>(apiBase,token,'/care/schools/'+selected?.id),
    enabled:!!apiBase&&!!token&&allowed&&!!selected});
  const save=async()=>{
    if(!selected||!note.trim())return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/care/schools/'+selected.id+'/calls',{method:'POST',
        body:JSON.stringify({content:note.trim(),next_follow_up_at:nextAt?new Date(nextAt).toISOString():null})});
      setNote('');setNextAt('');
      await Promise.all([details.refetch(),client.invalidateQueries({queryKey:['care-schools']}),onChanged()]);
    }catch(cause){setError(cause instanceof Error?cause.message:'Không thể lưu nhật ký cuộc gọi.');}
    finally{setBusy(false);}
  };
  if(!allowed)return <p role="alert">Không có quyền xem trường phụ trách.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Trường phụ trách"
      description="Tra cứu trường được Admin giao, xem liên hệ và ghi lại hướng dẫn sử dụng qua điện thoại."/>
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc. Kết nối Backend để xem trường phụ trách.</p>}
    {query.error&&<p role="alert" className="rounded-xl border p-4 text-sm text-destructive">{query.error.message}</p>}
    <AdminListPanel>
      <AdminListToolbar search={searchDraft} onSearchChange={setSearchDraft}
        onSearch={()=>{setSearch(searchDraft.trim());setPage(1);}}
        onReset={()=>{setSearchDraft('');setSearch('');setPage(1);}}
        searchLabel="Tìm trường được phân công" placeholder="Tên trường, mã hợp đồng, số điện thoại..."/>
      <div className="overflow-x-auto"><table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr>
          <th className={adminTableCellClass}>Tên trường</th><th className={adminTableCellClass}>Hợp đồng</th>
          <th className={adminTableCellClass}>Đầu mối liên hệ</th><th className={adminTableCellClass}>Ticket mở</th>
          <th className={adminTableCellClass}>Thao tác</th>
        </tr></thead>
        <tbody>{query.data?.data.map(x=><tr key={x.id} className="border-b even:bg-muted/20">
          <td className={adminTableCellClass}><span className="font-semibold">{x.school_name}</span></td>
          <td className={adminTableCellClass}>{x.contract_code}</td>
          <td className={adminTableCellClass}>{x.contact_name??'Chưa cập nhật'}<p className="text-xs text-muted-foreground">{x.phone??'Chưa có SĐT'}</p></td>
          <td className={adminTableCellClass}>{x.open_tickets}</td>
          <td className={adminTableCellClass}><AdminIconAction icon={Eye} label={'Xem chi tiết '+x.school_name}
            disabled={!apiBase} onClick={()=>{setSelected(x);setError('');}}/></td>
        </tr>)}</tbody>
      </table></div>
      {query.isLoading&&<p className="p-6 text-sm text-muted-foreground">Đang tải danh sách…</p>}
      {query.data?.data.length===0&&<p className="p-6 text-sm text-muted-foreground">Chưa được phân công trường nào.</p>}
      <AppPagination page={page} pageSize={pageSize} total={query.data?.total??0} showSummary={false}
        disabled={query.isFetching||!apiBase} pageSizeOptions={[10,20,50]}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDrawer wide open={!!selected} onOpenChange={open=>{if(!open&&!busy){setSelected(null);setNote('');setNextAt('');}}}
      title={selected?.school_name??'Trường phụ trách'} description="Thông tin hỗ trợ và nhật ký"
      busy={busy} footer={<><AppButton tone="neutral" onClick={()=>setSelected(null)} disabled={busy}>Đóng</AppButton>
        <AppButton disabled={!note.trim()||busy} busy={busy} onClick={()=>void save()}>Lưu nhật ký hỗ trợ</AppButton></>}>
      {details.isLoading&&<p className="text-sm text-muted-foreground">Đang tải thông tin trường…</p>}
      {details.error&&<p role="alert" className="text-sm text-destructive">{details.error.message}</p>}
      {details.data&&<div className="space-y-5 text-sm">
        <section className="rounded-xl border bg-muted/20 p-4">
          <h3 className="mb-2 font-semibold">Thông tin trường và liên hệ</h3>
          <p>Hợp đồng: {details.data.data.contract_code}</p>
          <p>Địa chỉ: {details.data.data.address??'Chưa cập nhật'}</p>
          <p>Liên hệ: {details.data.data.contact_name??'Chưa cập nhật'} ({details.data.data.contact_position??'—'})</p>
          <p>SĐT: {details.data.data.phone??'—'} · Email: {details.data.data.email??'—'}</p>
        </section>
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold"><PhoneCall className="size-4"/> Nhật ký hướng dẫn sử dụng</h3>
          <label className="block" htmlFor="care-call-content">Nội dung cuộc gọi và kết quả</label>
          <textarea id="care-call-content" rows={3} maxLength={4000} value={note}
            onChange={e=>setNote(e.target.value)} className="w-full rounded-xl border bg-background p-3"
            placeholder="Ví dụ: Trường hỏi cách đăng nhập, CSKH đã hướng dẫn thao tác…"/>
          <label className="block" htmlFor="care-call-next">Lịch hẹn hỗ trợ tiếp (không bắt buộc)</label>
          <input id="care-call-next" type="datetime-local" value={nextAt} onChange={e=>setNextAt(e.target.value)}
            className="w-full rounded-xl border bg-background p-3"/>
          {error&&<p role="alert" className="text-destructive">{error}</p>}
          {details.data.calls.filter(c=>c.activity_type==='SUPPORT'&&!c.support_case_id).map(c=>
            <div key={c.id} className="rounded-xl border p-3">
              <p>{c.content}</p><p className="mt-1 text-xs text-muted-foreground">{c.user_name} · {channelDate(c.created_at)}
                {c.next_follow_up_at?' · Hẹn: '+channelDate(c.next_follow_up_at):''}</p>
            </div>)}
        </section>
        <section className="space-y-2"><h3 className="flex items-center gap-2 font-semibold"><TicketPlus className="size-4"/> Ticket lỗi phần mềm</h3>
          {details.data.tickets.map(t=><div key={t.id} className="rounded-xl border p-3">
            <p className="font-medium">{t.subject} · {t.status}</p>
            <p className="text-xs text-muted-foreground">{t.checkee_responded_at?'CHECKEE đã phản hồi':'Chưa có phản hồi hoàn tất'} · {channelDate(t.created_at)}</p>
          </div>)}
          {details.data.tickets.length===0&&<p className="text-muted-foreground">Chưa phát sinh ticket.</p>}
          <AppButton tone="outline" onClick={()=>{setSelected(null);onSalesNavigate?.('role-customer-care-cases');}}>Xem ticket lỗi hệ thống</AppButton>
        </section>
        <section className="space-y-2"><h3 className="font-semibold">Lịch sử phân công</h3>
          {details.data.handovers.map(h=><p key={h.id} className="rounded-xl border p-3">{h.assigned_by} → {h.assigned_name}
            <span className="block text-xs text-muted-foreground">{h.reason} · {channelDate(h.created_at)}</span></p>)}
        </section>
      </div>}
    </AppDrawer>
  </div>;
}
