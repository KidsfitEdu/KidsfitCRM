'use client';

import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Eye,PhoneCall,TicketPlus,History,SquarePen,CalendarClock} from 'lucide-react';
import {SchoolProfileDetails, type SchoolProfileUnit} from '@/components/crm/schools/school-profile-details';
import {AppStatusBadge} from '@/components/common/app-status-badge';
import {AppNativeSelect} from '@/components/common/app-native-select';
import {AppPageHeader} from '@/components/common/app-page-header';
import {AdminListPanel,AdminListToolbar,AdminIconAction,adminTableClass,adminTableHeadClass,adminTableCellClass} from '@/components/common/admin-list-ui';
import {AppPagination} from '@/components/common/app-pagination';
import {AppDrawer} from '@/components/common/drawers/app-drawer';
import {AppButton} from '@/components/common/buttons/app-button';
import {channelRequest,channelDate} from '@/lib/channel-operations';
import type {RolePageProps} from '@/types/role-pages';

type School={id:number;customer_id:number;contract_code:string;status:string;verified_at:string|null;
  school_name:string;contact_name:string|null;phone:string|null;email:string|null;
  open_tickets:number;last_support_at:string|null;eligible_contract_count:number;
  service_status?:string|null;gi01_status?:string|null;care_action?:string|null;
  gap_start_on:string|null;threshold_on:string|null;next_service_start_on:string|null;
  has_pending_renewal:boolean};
type List={data:School[];total:number;page:number;page_size:number};
type Detail={data:School&{address:string|null;contact_position:string|null};school_units:SchoolProfileUnit[];
  calls:{id:number;activity_type:string;support_case_id:number|null;content:string;created_at:string;next_follow_up_at:string|null;user_name:string|null}[];
  tickets:{id:number;subject:string;ticket_type:string;status:string;checkee_responded_at:string|null;created_at:string}[];
  handovers:{id:number;reason:string;created_at:string;assigned_name:string|null;assigned_by:string|null}[]};
type Tab='overview'|'history'|'log';
const serviceLabels:Record<string,string>={
  CONTINUOUS:'Đang sử dụng',INTERRUPTED:'Đang gián đoạn',
  THRESHOLD_REACHED:'Đủ 12 tháng',
  HISTORICALTHRESHOLDREQUIRESREVIEW:'Cần rà soát kỳ sử dụng',
  MISSINGSERVICETERM:'Thiếu kỳ dịch vụ',
};
const careActions:Record<string,{label:string;status:string}>={
  CONTACT_SCHOOL:{label:'Liên hệ tìm hiểu',status:'FOLLOW_UP'},
  CONTACT_PRIORITY:{label:'Ưu tiên liên hệ',status:'FOLLOW_UP'},
  FOLLOW_UP_12M:{label:'Theo dõi kết quả xử lý',status:'REVIEW_HISTORY'},
  FOLLOW_UP_TICKET:{label:'Theo dõi ticket',status:'WAIT_ACCOUNTING'},
  FOLLOW_UP_ACCOUNTING:{label:'Theo dõi Kế toán',status:'WAIT_ACCOUNTING'},
  ESCALATE_CASE:{label:'Chuyển bộ phận phụ trách',status:'REVIEW_RIGHTS'},
};
const date=(value:string|null)=>value
  ? new Date(value.slice(0,10)+'T00:00:00+07:00').toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})
  :'—';

export function CustomersPage({apiBase,token,abilities,onChanged,onSalesNavigate}:RolePageProps){
  const allowed=!apiBase||abilities.includes('*')||abilities.includes('channel_sales.school.support.manage');
  const [draft,setDraft]=useState('');const [search,setSearch]=useState('');
  const [status,setStatus]=useState('ALL');
  const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(20);
  const [selected,setSelected]=useState<School|null>(null);
  const [tab,setTab]=useState<Tab>('overview');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const client=useQueryClient();
  const query=useQuery({queryKey:['care-schools',token,page,pageSize,search,status],
    queryFn:()=>{const args=new URLSearchParams({
      page:String(page),page_size:String(pageSize),search,status
    });return channelRequest<List>(apiBase,token,'/care/schools?'+args);},
    enabled:!!apiBase&&!!token&&allowed});
  const details=useQuery({queryKey:['care-school-detail',token,selected?.id],
    queryFn:()=>channelRequest<Detail>(apiBase,token,'/care/schools/'+selected!.id),
    enabled:!!apiBase&&!!token&&allowed&&!!selected});
  const open=(school:School,next:Tab)=>{
    setSelected(school);setTab(next);setNote('');setError('');
  };
  const save=async()=>{
    if(!selected||!note.trim()||note.trim().length>4000||busy)return;
    setBusy(true);setError('');
    try{
      await channelRequest(apiBase,token,'/care/schools/'+selected.id+'/calls',{method:'POST',
        body:JSON.stringify({content:note.trim(),next_follow_up_at:null})});
      setNote('');setTab('history');
      await Promise.all([
        client.invalidateQueries({queryKey:['care-schools']}),
        client.invalidateQueries({queryKey:['care-school-detail']}),
        onChanged()
      ]);
    }catch(cause){setError(cause instanceof Error?cause.message:'Không thể lưu nhật ký cuộc gọi.');}
    finally{setBusy(false);}
  };
  if(!allowed)return <p role="alert">Không có quyền xem trường phụ trách.</p>;
  const school=selected;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CSKH / KIDSFIT CRM" title="Trường phụ trách"
      description="Theo dõi tình trạng sử dụng, liên hệ và hỗ trợ các trường được phân công."/>
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc. Kết nối Backend để xem trường phụ trách.</p>}
    {query.error&&<p role="alert" className="rounded-xl border p-4 text-sm text-destructive">{query.error.message}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setStatus('ALL');setPage(1);}}
        searchLabel="Tìm trường được phân công" placeholder="Tên trường, mã hợp đồng, số điện thoại..."
        filters={<AppNativeSelect aria-label="Lọc tình trạng chăm sóc"
          containerClassName="w-full sm:w-52" value={status}
          onChange={event=>{setStatus(event.target.value);setPage(1);}}>
          <option value="ALL">Tất cả tình trạng</option>
          <option value="CONTINUOUS">Đang sử dụng</option>
          <option value="INTERRUPTED">Đang gián đoạn</option>
          <option value="THRESHOLD_REACHED">Đủ 12 tháng</option>
          <option value="NEEDS_CARE">Cần chăm sóc</option>
        </AppNativeSelect>}/>
      <div className="overflow-x-auto"><table className={adminTableClass+' min-w-[920px]'}>
        <thead className={adminTableHeadClass}><tr>
          <th scope="col" className={adminTableCellClass}>Nhà trường</th>
          <th scope="col" className={adminTableCellClass}>Liên hệ</th>
          <th scope="col" className={adminTableCellClass}>Dịch vụ</th>
          <th scope="col" className={adminTableCellClass}>Cần chăm sóc</th>
          <th scope="col" className={adminTableCellClass+' text-center'}>Thao tác</th>
        </tr></thead>
        <tbody className="divide-y divide-border/70">
          {query.data?.data.map(x=><tr key={x.customer_id} className="even:bg-muted/20 hover:bg-muted/40">
            <td className={adminTableCellClass}>
              <p className="font-semibold">{x.school_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{x.contract_code}</p>
            </td>
            <td className={adminTableCellClass}>
              {x.contact_name??'Chưa cập nhật'}
              <p className="mt-1 text-xs text-muted-foreground">{x.phone??'Chưa có SĐT'}</p>
            </td>
            <td className={adminTableCellClass}>
              <AppStatusBadge status={x.service_status ?? 'NO_SERVICE'}
                label={serviceLabels[x.service_status]??'Cần rà soát dịch vụ'}/>
            </td>
            <td className={adminTableCellClass}>
              {x.care_action ? <AppStatusBadge
                status={careActions[x.care_action]?.status??'REVIEW_HISTORY'}
                label={careActions[x.care_action]?.label??'Cần kiểm tra'}/> :
                <span className="text-muted-foreground" aria-label="Không có việc cần chăm sóc">—</span>}
              {x.open_tickets>0&&<p className="mt-1 text-xs text-muted-foreground">{x.open_tickets} ticket đang mở</p>}
            </td>
            <td className={adminTableCellClass}>
              <div className="flex justify-center gap-2">
                <AdminIconAction icon={Eye} label={'Xem chi tiết '+x.school_name}
                  disabled={!apiBase} onClick={()=>open(x,'overview')}/>
                <AdminIconAction icon={SquarePen} label={'Ghi nhật ký '+x.school_name}
                  disabled={!apiBase} onClick={()=>open(x,'log')}/>
                <AdminIconAction icon={History} label={'Xem lịch sử hỗ trợ '+x.school_name}
                  disabled={!apiBase} onClick={()=>open(x,'history')}/>
              </div>
            </td>
          </tr>)}
        </tbody>
      </table></div>
      {query.isLoading&&<p className="p-6 text-sm text-muted-foreground">Đang tải danh sách…</p>}
      {query.data?.data.length===0&&!query.isLoading&&
        <p className="p-6 text-sm text-muted-foreground">Chưa có trường phù hợp trong phạm vi CSKH được phân công.</p>}
      <AppPagination page={page} pageSize={pageSize} total={query.data?.total??0} showSummary={false}
        disabled={query.isFetching||!apiBase} pageSizeOptions={[10,20,50]}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>

    <AppDrawer wide open={!!school} onOpenChange={value=>{if(!value&&!busy){setSelected(null);setError('');}}}
      busy={busy} title="Chi tiết trường phụ trách" description={school?.school_name??''}
      footer={<div className="flex flex-wrap justify-end gap-2">
        <AppButton tone="neutral" disabled={busy} onClick={()=>setSelected(null)}>Đóng</AppButton>
        {tab==='log'&&<AppButton busy={busy} disabled={!note.trim()||note.trim().length>4000}
          onClick={()=>void save()}>Lưu nhật ký</AppButton>}
      </div>}>
      {school&&<div className="space-y-5 text-sm">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3" role="tablist" aria-label="Nội dung trường phụ trách">
          {([
            ['overview','Tổng quan'],['history','Lịch sử hỗ trợ'],['log','Ghi nhật ký']
          ] as const).map(([value,label])=><button key={value} type="button" role="tab"
            aria-selected={tab===value} onClick={()=>setTab(value)}
            className={'rounded-lg px-3 py-2 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary '+
              (tab===value?'bg-[#1b5e20] text-white':'bg-muted text-foreground hover:bg-muted/70')}>
            {label}
          </button>)}
        </div>
        {details.isLoading&&<p className="text-muted-foreground">Đang tải thông tin trường…</p>}
        {details.error&&<p role="alert" className="text-destructive">{details.error.message}</p>}
        {tab==='overview'&&<div className="space-y-4">
          <section className="rounded-xl border p-4">
            <h3 className="mb-3 font-semibold">Nhà trường và hợp đồng</h3>
            {details.data&&<SchoolProfileDetails units={details.data.school_units}/>}
            <div className="mt-3 space-y-1">
              <p>Mã hợp đồng: {school.contract_code}</p>
              <p>Đầu mối liên hệ: {school.contact_name??'Chưa cập nhật'}</p>
              <p>Số điện thoại: {school.phone??'Chưa có'}</p>
              <p>Ngày xác minh: {school.verified_at?channelDate(school.verified_at):'Chưa xác minh'}</p>
              {school.eligible_contract_count>1&&<p className="text-muted-foreground">
                Có {school.eligible_contract_count} hợp đồng được giao chăm sóc; đang xem hợp đồng mới nhất.</p>}
            </div>
          </section>
          <section className="space-y-2 rounded-xl border p-4">
            <h3 className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4"/>Tình trạng sử dụng dịch vụ</h3>
            <AppStatusBadge status={school.service_status ?? 'NO_SERVICE'}
              label={serviceLabels[school.service_status]??'Cần rà soát dịch vụ'}/>
            <p>Bắt đầu gián đoạn: {date(school.gap_start_on)}</p>
            <p>Mốc đủ 12 tháng: {date(school.threshold_on)}</p>
            <p>Kỳ sử dụng tiếp theo: {date(school.next_service_start_on)}</p>
            {school.has_pending_renewal&&<p>Hồ sơ tái ký: Đang chờ Kế toán</p>}
            {school.care_action&&<p className="pt-1 font-medium">
              Cần chăm sóc: {careActions[school.care_action]?.label??'Cần kiểm tra'}</p>}
          </section>
          <section className="rounded-xl border p-4">
            <h3 className="mb-2 font-semibold">Hỗ trợ khách hàng</h3>
            <p>Ticket đang mở: {school.open_tickets}</p>
            <p>Lần hỗ trợ gần nhất: {school.last_support_at?channelDate(school.last_support_at):'Chưa có'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AppButton tone="outline" leadingIcon={<PhoneCall className="size-4"/>} onClick={()=>setTab('log')}>Ghi nhật ký</AppButton>
              <AppButton tone="neutral" leadingIcon={<History className="size-4"/>} onClick={()=>setTab('history')}>Lịch sử hỗ trợ</AppButton>
            </div>
          </section>
        </div>}
        {tab==='log'&&<section className="space-y-3 rounded-xl border p-4">
          <h3 className="flex items-center gap-2 font-semibold"><SquarePen className="size-4"/>Nhật ký hướng dẫn</h3>
          <label className="block font-medium" htmlFor="care-call-content">Nội dung hướng dẫn và kết quả *</label>
          <textarea id="care-call-content" rows={6} maxLength={4000} value={note}
            onChange={e=>{setNote(e.target.value);setError('');}}
            placeholder="Nhập nội dung đã hướng dẫn, phản hồi của nhà trường và kết quả xử lý..."
            className="w-full rounded-xl border border-border bg-background p-3 text-foreground"/>
          <p className="text-xs text-muted-foreground">{note.length}/4.000 ký tự</p>
          {error&&<p role="alert" className="text-destructive">{error}</p>}
        </section>}
        {tab==='history'&&<div className="space-y-4">
          <section className="space-y-2 rounded-xl border p-4">
            <h3 className="flex items-center gap-2 font-semibold"><PhoneCall className="size-4"/>Nhật ký chăm sóc</h3>
            {details.data?.calls.filter(c=>c.activity_type==='SUPPORT'&&!c.support_case_id).map(c=>
              <div key={c.id} className="rounded-lg border p-3">
                <p>{c.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.user_name??'CSKH'} · {channelDate(c.created_at)}</p>
              </div>)}
            {details.data&&!details.data.calls.some(c=>c.activity_type==='SUPPORT'&&!c.support_case_id)&&
              <p className="text-muted-foreground">Chưa có nhật ký hướng dẫn.</p>}
          </section>
          <section className="space-y-2 rounded-xl border p-4">
            <h3 className="flex items-center gap-2 font-semibold"><TicketPlus className="size-4"/>Ticket lỗi hệ thống</h3>
            {details.data?.tickets.map(t=><div key={t.id} className="rounded-lg border p-3">
              <p className="font-medium">{t.subject} · {t.status}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.checkee_responded_at?'CHECKEE đã phản hồi':'Chưa có phản hồi hoàn tất'} · {channelDate(t.created_at)}
              </p>
            </div>)}
            {details.data&&details.data.tickets.length===0&&<p className="text-muted-foreground">Chưa có ticket.</p>}
            <AppButton tone="outline" onClick={()=>{setSelected(null);onSalesNavigate?.('role-customer-care-cases');}}>
              Xem ticket lỗi hệ thống
            </AppButton>
          </section>
        </div>}
      </div>}
    </AppDrawer>
  </div>;
}
