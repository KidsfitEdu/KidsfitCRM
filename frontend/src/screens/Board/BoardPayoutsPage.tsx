'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { AppSelect } from '@/components/common/app-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { appNotice } from '@/components/common/app-toast-provider';
import { channelRequest, channelMoney, channelDate } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

type Payout = {
  id:number; code:string; organization_id:number; organization_name:string; period:string;
  status:string; created_at:string; submitted_at:string|null;
  beneficiary_role:'SALES'|'MANAGER'; beneficiary_user_id:number; beneficiary_name:string;
  created_by_user_id:number; creator_name:string;
  suggested_rate_percent:number; suggested_amount:number;
  requested_rate_percent:number; requested_amount:number; adjustment_reason:string|null;
  withholding_amount:number; withholding_reason:string|null; net_amount:number;
  approved_at:string|null; paid_at:string|null; payment_reference:string|null;
  school_name:string|null; contract_code:string|null;
  events:{event_type:string;reason:string|null;created_at:string}[];
};
type ApprovalQueue = {
  items:Payout[];
  organizations:{id:number;name:string}[];
  summary:{pending_count:number;pending_amount:number};
  pagination:{page:number;page_size:number;total:number};
};

const statusLabels:Record<string,string>={
  PENDING_APPROVAL:'Chờ BGĐ duyệt',
  CHANGES_REQUESTED:'Cần bổ sung',
  APPROVED:'Đã duyệt',
  PAID:'Đã thanh toán',
};
const statusOptions=[
  {value:'PENDING_APPROVAL',label:'Chờ duyệt'},
  {value:'CHANGES_REQUESTED',label:'Yêu cầu bổ sung'},
  {value:'APPROVED',label:'Đã duyệt'},
  {value:'PAID',label:'Đã thanh toán'},
  {value:'ALL',label:'Tất cả phiếu đã gửi'},
];
const difference=(p:Payout)=>p.suggested_rate_percent!==p.requested_rate_percent||
  p.suggested_amount!==p.requested_amount;

export function BoardPayoutsPage({apiBase,token,abilities,onChanged}:RolePageProps){
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.payout.approve');
  const connected=Boolean(apiBase&&token&&allowed);
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [status,setStatus]=useState('PENDING_APPROVAL');
  const [organization,setOrganization]=useState('ALL');
  const [searchDraft,setSearchDraft]=useState('');
  const [search,setSearch]=useState('');
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [confirmId,setConfirmId]=useState<number|null>(null);
  const [returnId,setReturnId]=useState<number|null>(null);
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const query=useQuery({
    queryKey:['board','payout-approvals',apiBase,page,pageSize,status,organization,search],
    queryFn:()=>channelRequest<ApprovalQueue>(apiBase,token,
      '/payouts/approval-queue?page='+page+'&pageSize='+pageSize+
      '&status='+encodeURIComponent(status)+
      (organization==='ALL'?'':'&organizationId='+encodeURIComponent(organization))+
      (search?'&search='+encodeURIComponent(search):'')),
    enabled:connected,
  });
  const data=query.data;
  const selected=data?.items.find(x=>x.id===selectedId)??null;
  const confirmation=data?.items.find(x=>x.id===confirmId);
  const returning=data?.items.find(x=>x.id===returnId);
  const perform=async(id:number,decision:'approve'|'return')=>{
    if(busy)return;
    if(decision==='return'&&!reason.trim())return;
    setBusy(true);
    try{
      await channelRequest(apiBase,token,'/payouts/'+id+'/'+decision,{
        method:'POST',
        ...(decision==='return'?{body:JSON.stringify({reason:reason.trim()})}:{})
      });
      setSelectedId(null);setConfirmId(null);setReturnId(null);setReason('');
      await query.refetch();await onChanged();
      appNotice.success(decision==='approve'
        ?'Đã duyệt phiếu chi. Kế toán có thể chuyển khoản và upload chứng từ.'
        :'Đã trả phiếu về Kế toán bổ sung.');
    }catch(error){
      appNotice.error(decision==='approve'?'Không duyệt được phiếu chi.':'Không thể trả phiếu.',
        error instanceof Error?error.message:'Vui lòng thử lại.');
      await query.refetch();
    }finally{setBusy(false);}
  };
  const canDecide=(p:Payout)=>p.status==='PENDING_APPROVAL'&&allowed;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Duyệt phiếu chi"
      description="Kiểm tra số tiền Kế toán đề nghị so với chính sách BGĐ, phê duyệt hoặc trả về bổ sung."
      />
    <AdminListPanel>
      <AdminListToolbar search={searchDraft} onSearchChange={setSearchDraft}
        onSearch={()=>{setSearch(searchDraft.trim());setPage(1);}}
        onReset={()=>{setSearchDraft('');setSearch('');setStatus('PENDING_APPROVAL');setOrganization('ALL');setPage(1);}}
        placeholder="Mã phiếu, người hưởng, Kế toán..." searchLabel="Tìm phiếu chi"
        filters={<>
          <AppSelect ariaLabel="Lọc trạng thái phiếu chi" className="w-full sm:w-44" value={status}
            options={statusOptions}
            onValueChange={next=>{setStatus(next);setPage(1);}}/>
          <AppSelect ariaLabel="Lọc tổ chức phiếu chi" className="w-full sm:w-48" value={organization}
            options={[{value:'ALL',label:'Tất cả tổ chức'},...(data?.organizations??[]).map(o=>({value:String(o.id),label:o.name}))]}
            onValueChange={next=>{setOrganization(next);setPage(1);}}/>
        </>}/>
      {!connected&&<p className="p-5 text-sm text-muted-foreground">Tài khoản chưa có quyền duyệt phiếu chi hoặc chưa kết nối API.</p>}
      {query.error&&<p role="alert" className="p-5 text-sm text-destructive">
        {query.error instanceof Error?query.error.message:'Không tải được phiếu chi.'}
      </p>}
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr>
            {['Phiếu chi / Trường','Người hưởng','Kế toán gửi','Hệ thống đề xuất','Kế toán đề nghị','Trạng thái','Thao tác']
              .map(h=><th scope="col" key={h} className="px-4 py-4">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-border/70">
            {(data?.items??[]).map(p=><tr key={p.id} className="hover:bg-muted/20">
              <td className="px-4 py-3">
                <p className="font-semibold">{p.code}</p>
                <p className="mt-1 max-w-52 text-xs text-muted-foreground">{p.school_name||p.organization_name}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{p.beneficiary_name}</p>
                <p className="text-xs text-muted-foreground">{p.beneficiary_role==='MANAGER'?'Quản lý':'Sales'}</p>
              </td>
              <td className="px-4 py-3">
                <p>{p.creator_name}</p>
                <p className="text-xs text-muted-foreground">{channelDate(p.submitted_at)}</p>
              </td>
              <td className="px-4 py-3 tabular-nums">
                <p className="font-medium">{channelMoney(p.suggested_amount)}</p>
                <p className="text-xs text-muted-foreground">{p.suggested_rate_percent}%</p>
              </td>
              <td className="px-4 py-3 tabular-nums">
                <p className="font-semibold">{channelMoney(p.requested_amount)}</p>
                <p className="text-xs text-muted-foreground">{p.requested_rate_percent}%</p>
                {difference(p)&&<span className="text-xs text-amber-700 dark:text-amber-300">Có điều chỉnh</span>}
              </td>
              <td className="px-4 py-3">
                <AdminStatusBadge label={statusLabels[p.status]??p.status} status={p.status}/>
              </td>
              <td className="px-4 py-3">
                <AdminIconAction icon={Eye} label={'Xem phiếu chi '+p.code} onClick={()=>setSelectedId(p.id)}/>
              </td>
            </tr>)}
          </tbody>
        </table>
        {connected&&!query.isFetching&&!query.error&&!data?.items.length&&
          <p className="p-8 text-center text-sm text-muted-foreground">
            {status==='PENDING_APPROVAL'?'Chưa có phiếu chi nào Kế toán gửi chờ BGĐ duyệt.':'Không có phiếu phù hợp với bộ lọc.'}
          </p>}
        {query.isFetching&&<p className="p-4 text-sm text-muted-foreground">Đang tải danh sách phiếu chi...</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={data?.pagination.total??0}
        disabled={query.isFetching} showSummary={false} itemLabel="phiếu chi"
        pageSizeOptions={[10,20,50,100]}
        onPageSizeChange={size=>{setPageSize(size);setPage(1);}} onPageChange={setPage}/>
    </AdminListPanel>
    <AppDrawer wide open={selected!==null} onOpenChange={open=>{if(!open&&!busy)setSelectedId(null);}}
      busy={busy} title={selected?'Chi tiết '+selected.code:'Chi tiết phiếu chi'}>
      {selected&&<div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AdminStatusBadge status={selected.status} label={statusLabels[selected.status]??selected.status}/>
          <span className="text-xs text-muted-foreground">Kỳ hoa hồng {selected.period}</span>
        </div>
        <section className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">Thông tin phiếu chi</h3>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Trường học',selected.school_name??'—'],['Hợp đồng',selected.contract_code??'—'],
              ['Tổ chức',selected.organization_name],['Người hưởng',selected.beneficiary_name],
              ['Vai trò',selected.beneficiary_role==='MANAGER'?'Quản lý':'Sales'],
              ['Kế toán lập phiếu',selected.creator_name],
            ].map(([name,value])=><div key={name}>
              <dt className="text-xs text-muted-foreground">{name}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>)}
          </dl>
        </section>
        <section className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">Đối chiếu hoa hồng</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Hệ thống đề xuất</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{channelMoney(selected.suggested_amount)}</p>
              <p className="text-sm text-muted-foreground">{selected.suggested_rate_percent}%</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">Kế toán đề nghị</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{channelMoney(selected.requested_amount)}</p>
              <p className="text-sm text-muted-foreground">{selected.requested_rate_percent}%</p>
            </div>
          </div>
          {difference(selected)&&<div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50/50 p-3 dark:bg-amber-950/20">
            <p className="text-xs font-medium">Lý do điều chỉnh *</p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{selected.adjustment_reason||'Chưa được cung cấp — không nên duyệt.'}</p>
          </div>}
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-2"><dt>Khấu trừ</dt><dd className="font-medium tabular-nums">{channelMoney(selected.withholding_amount)}</dd></div>
            {selected.withholding_reason&&<p className="text-xs text-muted-foreground">Lý do khấu trừ: {selected.withholding_reason}</p>}
            <div className="flex justify-between gap-2 border-t pt-3"><dt className="font-semibold">Tổng thực chi</dt><dd className="text-lg font-bold tabular-nums">{channelMoney(selected.net_amount)}</dd></div>
          </dl>
        </section>
        <section className="rounded-xl border p-4">
          <h3 className="mb-3 font-semibold">Lịch sử xử lý</h3>
          {selected.events.length?
            <div className="space-y-3">{selected.events.map((event,i)=><div key={i} className="border-l-2 border-primary/30 pl-3 text-sm">
              <p className="font-medium">{event.event_type}</p>
              <p className="text-xs text-muted-foreground">{channelDate(event.created_at)}</p>
              {event.reason&&<p className="mt-1 whitespace-pre-wrap">{event.reason}</p>}
            </div>)}</div>
            :<p className="text-sm text-muted-foreground">Chưa có lịch sử.</p>}
        </section>
        {canDecide(selected)&&<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AppButton tone="outline" disabled={busy} onClick={()=>{setReturnId(selected.id);setReason('');}}>
            Yêu cầu bổ sung
          </AppButton>
          <AppButton tone="green" disabled={busy||difference(selected)&&!selected.adjustment_reason?.trim()}
            onClick={()=>setConfirmId(selected.id)}>Phê duyệt phiếu chi</AppButton>
        </div>}
        {selected.status==='APPROVED'&&<p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
          Đã phê duyệt. Kế toán thực hiện chuyển khoản và tải chứng từ thanh toán.
        </p>}
      </div>}
    </AppDrawer>
    <ConfirmDialog open={confirmId!==null} onOpenChange={open=>{if(!open&&!busy)setConfirmId(null);}}
      busy={busy} title="Phê duyệt phiếu chi" confirmLabel="Xác nhận duyệt"
      description={confirmation?'Phê duyệt '+confirmation.code+' với số tiền thực chi '+channelMoney(confirmation.net_amount)+'? Sau khi duyệt, Kế toán mới được thanh toán.':undefined}
      onConfirm={()=>{if(confirmId!==null)void perform(confirmId,'approve');}}/>
    <ConfirmDialog open={returnId!==null} onOpenChange={open=>{if(!open&&!busy){setReturnId(null);setReason('');}}}
      busy={busy} confirmDisabled={!reason.trim()} title="Yêu cầu Kế toán bổ sung" confirmLabel="Trả phiếu về Kế toán"
      description={returning?'Trả phiếu '+returning.code+' về cho Kế toán chỉnh sửa. Lý do được ghi vào lịch sử.':undefined}
      onConfirm={()=>{if(returnId!==null)void perform(returnId,'return');}}>
      <label htmlFor="board-payout-return-reason" className="block text-sm font-medium">Lý do yêu cầu bổ sung *</label>
      <Input id="board-payout-return-reason" value={reason} maxLength={1000}
        onChange={event=>setReason(event.target.value)}
        placeholder="Nhập nội dung cần Kế toán bổ sung..."/>
      {!reason.trim()&&<p className="text-xs text-muted-foreground">Bắt buộc nhập lý do trước khi trả phiếu.</p>}
    </ConfirmDialog>
  </div>;
}
