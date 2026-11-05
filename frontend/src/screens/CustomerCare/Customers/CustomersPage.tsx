'use client';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Eye,PhoneCall,TicketPlus,History,SquarePen} from 'lucide-react';
import {SchoolProfileDetails, type SchoolProfileUnit} from '@/components/crm/schools/school-profile-details';
import {AppPageHeader} from '@/components/common/app-page-header';
import { ContractLifecycleExplorer } from '@/components/crm/contract-lifecycle-explorer';
import {AdminListPanel,AdminListToolbar,AdminIconAction,adminTableClass,adminTableHeadClass,adminTableCellClass} from '@/components/common/admin-list-ui';
import {AppPagination} from '@/components/common/app-pagination';
import {AppDrawer} from '@/components/common/drawers/app-drawer';
import {AppButton} from '@/components/common/buttons/app-button';
import {channelRequest,channelDate} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';

type School={id:number;customer_id:number;contract_code:string;status:string;verified_at:string|null;
  school_name:string;contact_name:string|null;phone:string|null;email:string|null;open_tickets:number;last_support_at:string|null};
type List={data:School[];total:number;page:number;page_size:number};
type Detail={data:School&{address:string|null;contact_position:string|null};school_units:SchoolProfileUnit[];
  calls:{id:number;activity_type:string;support_case_id:number|null;content:string;created_at:string;next_follow_up_at:string|null;user_name:string|null}[];
  tickets:{id:number;subject:string;ticket_type:string;status:string;checkee_responded_at:string|null;created_at:string}[];
  handovers:{id:number;reason:string;created_at:string;assigned_name:string|null;assigned_by:string|null}[]};

export function CustomersPage({apiBase,token,abilities,onChanged,onSalesNavigate}:RolePageProps){
  const allowed=!apiBase||abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const [searchDraft,setSearchDraft]=useState('');const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(20);
  const [selected,setSelected]=useState<School|null>(null);
  const [historySelected,setHistorySelected]=useState<School|null>(null);
  const [logSelected,setLogSelected]=useState<School|null>(null);
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const client=useQueryClient();
  const query=useQuery({queryKey:['care-schools',token,page,pageSize,search],
    queryFn:()=>channelRequest<List>(apiBase,token,'/care/schools?page='+page+'&page_size='+pageSize+'&search='+encodeURIComponent(search)),
    enabled:!!apiBase&&!!token&&allowed});
  const viewedSchoolId=selected?.id??historySelected?.id;
  const details=useQuery({queryKey:['care-school-detail',token,viewedSchoolId],
    queryFn:()=>channelRequest<Detail>(apiBase,token,'/care/schools/'+viewedSchoolId),
    enabled:!!apiBase&&!!token&&allowed&&!!viewedSchoolId});
  const save=async()=>{
    if(!logSelected||!note.trim()||note.trim().length>4000||busy)return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/care/schools/'+logSelected.id+'/calls',{method:'POST',
        body:JSON.stringify({content:note.trim(),next_follow_up_at:null})});
      setNote('');setLogSelected(null);
      await Promise.all([client.invalidateQueries({queryKey:['care-schools']}),client.invalidateQueries({queryKey:['care-school-detail']}),onChanged()]);
    }catch(cause){setError(cause instanceof Error?cause.message:'Không thể lưu nhật ký cuộc gọi.');}
    finally{setBusy(false);}
  };
  if(!allowed)return <p role="alert">Không có quyền xem trường phụ trách.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Trường phụ trách"
      description="Tra cứu trường được Admin giao, xem liên hệ và ghi lại hướng dẫn sử dụng qua điện thoại."/>
    <ContractLifecycleExplorer apiBase={apiBase} token={token} mode="care" />

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
          <td className={adminTableCellClass}>
            <div className="flex items-center gap-2">
              <AdminIconAction icon={Eye} label={'Xem chi tiết '+x.school_name}
                disabled={!apiBase} onClick={()=>{setSelected(x);setError('');}}/>
              <AdminIconAction icon={SquarePen} label={'Cập nhật nhật ký hướng dẫn '+x.school_name}
                disabled={!apiBase} onClick={()=>{setLogSelected(x);setNote('');setError('');}}/>
              <AdminIconAction icon={History} label={'Xem lịch sử hỗ trợ '+x.school_name}
                disabled={!apiBase} onClick={()=>{setHistorySelected(x);setError('');}}/>
            </div>
          </td>
        </tr>)}</tbody>
      </table></div>
      {query.isLoading&&<p className="p-6 text-sm text-muted-foreground">Đang tải danh sách…</p>}
      {query.data?.data.length===0&&<p className="p-6 text-sm text-muted-foreground">Chưa được phân công trường nào.</p>}
      <AppPagination page={page} pageSize={pageSize} total={query.data?.total??0} showSummary={false}
        disabled={query.isFetching||!apiBase} pageSizeOptions={[10,20,50]}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDrawer wide open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}
      title={selected?.school_name??'Trường phụ trách'}
      description="Thông tin trường chính và phân hiệu"
      footer={<AppButton tone="neutral" onClick={()=>setSelected(null)}>Đóng</AppButton>}>
      {details.isLoading&&<p className="text-sm text-muted-foreground">Đang tải thông tin trường…</p>}
      {details.error&&<p role="alert" className="text-sm text-destructive">{details.error.message}</p>}
      {details.data&&<div className="space-y-4">
        <SchoolProfileDetails units={details.data.school_units}/>
        <section className="rounded-xl border bg-muted/20 p-4 text-sm">
          <h3 className="mb-2 font-semibold">Thông tin hợp đồng</h3>
          <p>Mã hợp đồng: {details.data.data.contract_code}</p>
          <p>Trạng thái: {details.data.data.status}</p>
          <p>Ngày xác minh: {details.data.data.verified_at?channelDate(details.data.data.verified_at):'Chưa xác minh'}</p>
        </section>
      </div>}
    </AppDrawer>
    <AppDrawer open={!!logSelected} onOpenChange={open=>{if(!open&&!busy){setLogSelected(null);setNote('');setError('');}}}
      title="Cập nhật nhật ký hướng dẫn"
      description={logSelected?.school_name??''}
      busy={busy}
      footer={<>
        <AppButton tone="neutral" disabled={busy} onClick={()=>setLogSelected(null)}>Hủy</AppButton>
        <AppButton busy={busy} disabled={busy||!note.trim()||note.trim().length>4000}
          onClick={()=>void save()}>Lưu nhật ký</AppButton>
      </>}>
      <div className="space-y-3 text-sm">
        <p className="rounded-xl border bg-muted/20 p-3 font-medium">{logSelected?.school_name}</p>
        <label className="block font-semibold" htmlFor="care-call-content">Nội dung hướng dẫn và kết quả *</label>
        <textarea id="care-call-content" rows={5} maxLength={4000} value={note}
          onChange={e=>{setNote(e.target.value);setError('');}}
          placeholder="Nhập nội dung đã hướng dẫn, phản hồi của nhà trường và kết quả xử lý..."
          className="w-full rounded-xl border bg-background p-3"/>
        <p className="text-xs text-muted-foreground">{note.length}/4.000 ký tự</p>
        {error&&<p role="alert" className="text-destructive">{error}</p>}
      </div>
    </AppDrawer>
    <AppDrawer wide open={!!historySelected} onOpenChange={open=>{if(!open)setHistorySelected(null);}}
      title="Lịch sử hỗ trợ"
      description={historySelected?.school_name??''}
      footer={<AppButton tone="neutral" onClick={()=>setHistorySelected(null)}>Đóng</AppButton>}>
      {details.isLoading&&<p className="text-sm text-muted-foreground">Đang tải lịch sử hỗ trợ…</p>}
      {details.error&&<p role="alert" className="text-sm text-destructive">{details.error.message}</p>}
      {details.data&&<div className="space-y-5 text-sm">
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold"><PhoneCall className="size-4"/> Nhật ký hướng dẫn sử dụng</h3>
          {details.data.calls.filter(c=>c.activity_type==='SUPPORT'&&!c.support_case_id).map(c=>
            <div key={c.id} className="rounded-xl border p-3">
              <p>{c.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.user_name} · {channelDate(c.created_at)}</p>
            </div>)}
          {details.data.calls.filter(c=>c.activity_type==='SUPPORT'&&!c.support_case_id).length===0&&
            <p className="text-muted-foreground">Chưa có nhật ký hướng dẫn.</p>}
        </section>
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold"><TicketPlus className="size-4"/> Ticket lỗi phần mềm</h3>
          {details.data.tickets.map(t=><div key={t.id} className="rounded-xl border p-3">
            <p className="font-medium">{t.subject} · {t.status}</p>
            <p className="text-xs text-muted-foreground">
              {t.checkee_responded_at?'CHECKEE đã phản hồi':'Chưa có phản hồi hoàn tất'} · {channelDate(t.created_at)}
            </p>
          </div>)}
          {details.data.tickets.length===0&&<p className="text-muted-foreground">Chưa phát sinh ticket.</p>}
          <AppButton tone="outline" onClick={()=>{setHistorySelected(null);onSalesNavigate?.('role-customer-care-cases');}}>
            Xem ticket lỗi hệ thống
          </AppButton>
        </section>
      </div>}
    </AppDrawer>
  </div>;
}
