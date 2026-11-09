'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Eye, RefreshCw, ShieldCheck, Send, X } from 'lucide-react';
import { channelRequest } from '@/lib/channel-operations';
import {
  AdminIconAction, AdminListPanel, AdminListToolbar, AdminStatusBadge,
  adminTableClass, adminTableCellClass, adminTableHeadClass,
} from '@/components/common/admin-list-ui';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppButton } from '@/components/common/buttons/app-button';

type RenewalCase = {
  id:number; contract_id:number; customer_name:string; contract_code:string;
  owner_name:string; organization_name:string; status:string; source:string; note:string|null;
  previous_protection_until:string; priority_until:string;
  decision_reason:string|null; reviewed_at:string|null;
  new_protection_from:string|null; new_protection_until:string|null;
  can_approve:boolean;
};
type EligibleCase = {
  contract_id:number; contract_code:string; customer_name:string;
  protected_until:string; priority_until:string; renewal_confirmed:boolean;
  request_id:number|null; request_status:string|null; can_request_review:boolean;
};
type Response<T> = {data:T;can_approve?:boolean};
type Row = {
  key:string; id:number|null; contractId:number; school:string; code:string;
  owner:string; organization:string; status:string; source:string|null; renewalConfirmed:boolean|null;
  protectionUntil:string; priorityUntil:string; newFrom:string|null; newUntil:string|null;
  note:string|null; reason:string|null; reviewedAt:string|null;
  canApprove:boolean; canRequest:boolean;
};
const labels:Record<string,string> = {
  WAITING_RENEWAL:'Chờ Kế toán xác nhận',
  PENDING_MANAGER:'Chờ Quản lý duyệt',
  APPROVED:'Đã cấp bảo vệ mới',
  REJECTED:'Đã từ chối',
  EXPIRED:'Hết thời gian ưu tiên',
  NOT_CREATED:'Chưa tạo hồ sơ',
};
const date=(value:string|null)=>value
  ? new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}) : '—';
const sourceLabel=(source:string|null)=>source==='MANUAL'?'Sales yêu cầu xem xét':source==='AUTO'?'CRM tự tạo':'Chưa có hồ sơ';
const milliseconds=(value:string)=>new Date(value).getTime();
const distinctSearch=(row:Row)=>`${row.school} ${row.code} ${row.owner}`.toLocaleLowerCase('vi');
const pageSizeOptions=[10,20,50];

export function ProtectionRenewalPanel({apiBase,token,mode}:{apiBase:string;token:string;mode:'sales'|'manager'}) {
  const [items,setItems]=useState<RenewalCase[]>([]);
  const [eligible,setEligible]=useState<EligibleCase[]>([]);
  const [canApprove,setCanApprove]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('ALL');
  const [renewal,setRenewal]=useState('ALL');
  const [source,setSource]=useState('ALL');
  const [organization,setOrganization]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [selected,setSelected]=useState<Row|null>(null);
  const [decision,setDecision]=useState<'approve'|'reject'|'request'|null>(null);
  const [reason,setReason]=useState('');

  const load=useCallback(async()=>{
    if(!apiBase||!token)return;
    setLoading(true);setError('');
    try {
      const rows=await channelRequest<Response<RenewalCase[]>>(apiBase,token,'/protection-renewals');
      setItems(rows.data);setCanApprove(!!rows.can_approve);
      if(mode==='sales'){
        const available=await channelRequest<Response<EligibleCase[]>>(apiBase,token,'/protection-renewals/eligible');
        setEligible(available.data);
      }
    }catch(e){setError(e instanceof Error?e.message:'Không thể tải hồ sơ bảo vệ.');}
    finally{setLoading(false);}
  },[apiBase,token,mode]);
  useEffect(()=>{void load();},[load]);

  // Combine Sales' eligibility + request history without duplicating a contract row.
  // Manager records use only the authorized, server-scoped queue.
  const rows=useMemo<Row[]>(()=>{
    const current=new Map<number,EligibleCase>(eligible.map(e=>[e.contract_id,e]));
    const cases=items.map(item=>{
      const e=current.get(item.contract_id);
      return {
        key:`case-${item.id}`,id:item.id,contractId:item.contract_id,
        school:item.customer_name,code:item.contract_code,owner:item.owner_name,organization:item.organization_name,
        status:item.status,source:item.source,renewalConfirmed:e?.renewal_confirmed??(item.status==='PENDING_MANAGER'||item.status==='APPROVED'?true:item.status==='WAITING_RENEWAL'?false:null),
        protectionUntil:item.previous_protection_until,priorityUntil:item.priority_until,
        newFrom:item.new_protection_from,newUntil:item.new_protection_until,
        note:item.note,reason:item.decision_reason,reviewedAt:item.reviewed_at,
        canApprove:item.can_approve&&canApprove,canRequest:false,
      };
    });
    if(mode==='manager')return cases;
    const withRequests=new Set(items.map(x=>x.contract_id));
    const withoutRequests:Row[]=eligible.filter(e=>!withRequests.has(e.contract_id)).map(e=>({
      key:`eligible-${e.contract_id}`,id:null,contractId:e.contract_id,
      school:e.customer_name,code:e.contract_code,owner:'—',organization:'—',
      status:e.request_status??'NOT_CREATED',source:null,
      renewalConfirmed:e.renewal_confirmed,protectionUntil:e.protected_until,
      priorityUntil:e.priority_until,newFrom:null,newUntil:null,
      note:null,reason:null,reviewedAt:null,canApprove:false,canRequest:e.can_request_review,
    }));
    return [...withoutRequests,...cases];
  },[eligible,items,mode,canApprove]);

  const organizations=useMemo(()=>[...new Set(rows.map(x=>x.organization).filter(x=>x!=='—'))].sort((a,b)=>a.localeCompare(b,'vi')),[rows]);
  const filtered=useMemo(()=>{
    const text=search.trim().toLocaleLowerCase('vi');
    return rows.filter(row=>(!text||distinctSearch(row).includes(text))
      &&(status==='ALL'||row.status===status)
      &&(source==='ALL'||(source==='NONE'?row.source===null:row.source===source))
      &&(organization==='ALL'||row.organization===organization)
      &&(renewal==='ALL'||(renewal==='CONFIRMED'?row.renewalConfirmed===true
        :renewal==='NOT_CONFIRMED'?row.renewalConfirmed===false:true)))
      .sort((a,b)=>milliseconds(a.priorityUntil)-milliseconds(b.priorityUntil));
  },[rows,search,status,source,organization,renewal]);
  const total=filtered.length;
  const currentPage=Math.min(page,Math.max(1,Math.ceil(total/pageSize)));
  const visible=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const count=(key:string)=>rows.filter(x=>x.status===key).length;
  const reset=()=>{setDraft('');setSearch('');setStatus('ALL');setSource('ALL');setOrganization('ALL');setRenewal('ALL');setPage(1);};
  const changeStatus=(value:string)=>{setStatus(value);setPage(1);};
  const send=async(row:Row,action:'approve'|'reject'|'request')=>{
    if(busy)return;
    if(action==='reject'&&!reason.trim()){setError('Vui lòng nhập lý do từ chối.');return;}
    if(reason.length>1000){setError('Lý do tối đa 1000 ký tự.');return;}
    setBusy(true);setError('');setMessage('');
    try{
      const path=action==='request'
        ?`/contracts/${row.contractId}/protection-renewal/request-review`
        :`/protection-renewals/${row.id}/${action}`;
      await channelRequest(apiBase,token,path,{method:'POST',body:JSON.stringify(
        action==='approve'?{}:{reason:reason.trim()})});
      setMessage(action==='approve'?'Đã xác nhận chu kỳ bảo vệ mới.':
        action==='reject'?'Đã từ chối hồ sơ.':'Đã gửi yêu cầu xem xét.');
      setDecision(null);setSelected(null);setReason('');await load();
    }catch(e){setError(e instanceof Error?e.message:'Không thể xử lý hồ sơ.');}
    finally{setBusy(false);}
  };
  const startDecision=(row:Row,action:'approve'|'reject'|'request')=>{
    setSelected(row);setDecision(action);setReason('');setError('');
  };
  const rowDetail=selected?rows.find(x=>x.key===selected.key)??selected:null;
  const activeDecision=decision&&rowDetail?{action:decision,row:rowDetail}:null;

  return <div aria-label="Gia hạn quyền bảo vệ 5 năm" className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck aria-hidden="true" className="size-5 text-[#1b5e20] dark:text-green-400"/>Gia hạn quyền bảo vệ 5 năm</h3>
        <p className="mt-1 text-sm text-muted-foreground">{mode==='sales'
          ?'Theo dõi bảo vệ, tái ký và yêu cầu xem xét. CRM tự tạo hồ sơ khi đủ điều kiện.'
          :'Theo dõi hồ sơ bảo vệ và xét duyệt theo phạm vi tổ chức được phân quyền.'}</p>
      </div>
      <AppButton type="button" tone="neutral" disabled={loading||busy} leadingIcon={<RefreshCw className="size-4"/>}
        onClick={()=>void load()}>Làm mới</AppButton>
    </header>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Tổng hợp hồ sơ bảo vệ">
      {[
        {label:'Chờ Kế toán',count:count('WAITING_RENEWAL')},
        {label:'Chờ Quản lý',count:count('PENDING_MANAGER')},
        {label:'Đã cấp mới',count:count('APPROVED')},
        {label:'Hết ưu tiên',count:count('EXPIRED')},
      ].map(item=><div key={item.label} className="rounded-xl border border-border/80 bg-card px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{item.count}</p>
      </div>)}
    </div>

    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
    {message&&<output className="block rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">{message}</output>}

    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}} onReset={reset}
        searchLabel="Tìm trường, mã hợp đồng hoặc Sales"
        placeholder="Tên trường, mã hợp đồng, Sales..."
        filters={<>
          <AppNativeSelect aria-label="Lọc trạng thái hồ sơ" containerClassName="w-full sm:w-52"
            value={status} onChange={e=>changeStatus(e.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </AppNativeSelect>
          <AppNativeSelect aria-label="Lọc nguồn hồ sơ" containerClassName="w-full sm:w-44"
            value={source} onChange={e=>{setSource(e.target.value);setPage(1);}}>
            <option value="ALL">Tất cả nguồn</option>
            <option value="AUTO">CRM tự tạo</option>
            <option value="MANUAL">Sales yêu cầu</option>
            {mode==='sales'&&<option value="NONE">Chưa có hồ sơ</option>}
          </AppNativeSelect>
          {mode==='manager'&&<AppNativeSelect aria-label="Lọc tổ chức Sales" containerClassName="w-full sm:w-44"
            value={organization} onChange={e=>{setOrganization(e.target.value);setPage(1);}}>
            <option value="ALL">Tất cả tổ chức</option>
            {organizations.map(name=><option key={name} value={name}>{name}</option>)}
          </AppNativeSelect>}
          {mode==='sales'&&<AppNativeSelect aria-label="Lọc xác nhận tái ký" containerClassName="w-full sm:w-44"
            value={renewal} onChange={e=>{setRenewal(e.target.value);setPage(1);}}>
            <option value="ALL">Tất cả tái ký</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="NOT_CONFIRMED">Chưa xác nhận</option>
          </AppNativeSelect>}
        </>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass+' min-w-[1040px]'}>
          <thead className={adminTableHeadClass}>
            <tr>
              <th scope="col" className="px-5 py-4">Trường học</th>
              {mode==='manager'&&<th scope="col" className="px-5 py-4">Sales / Tổ chức</th>}
              <th scope="col" className="px-5 py-4">Tái ký</th>
              <th scope="col" className="px-5 py-4">Trạng thái hồ sơ</th>
              <th scope="col" className="px-5 py-4">Bảo vệ cũ</th>
              <th scope="col" className="px-5 py-4">Ưu tiên đến</th>
              <th scope="col" className="px-5 py-4">Chu kỳ mới</th>
              <th scope="col" className="px-5 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {visible.map(row=><tr key={row.key} className="even:bg-muted/20 hover:bg-muted/40">
              <td className={adminTableCellClass}>
                <p className="font-semibold text-foreground">{row.school}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.code}</p>
              </td>
              {mode==='manager'&&<td className={adminTableCellClass}><p className="font-medium">{row.owner}</p><p className="mt-1 text-xs text-muted-foreground">{row.organization}</p></td>}
              <td className={adminTableCellClass}>
                {row.renewalConfirmed===null
                  ? <span className="text-xs text-muted-foreground">Xem hồ sơ</span>
                  : <AdminStatusBadge status={row.renewalConfirmed?'APPROVED':'WAITING_RENEWAL'}
                      label={row.renewalConfirmed?'Đã xác nhận':'Chưa xác nhận'}/>}
              </td>
              <td className={adminTableCellClass}>
                <AdminStatusBadge status={row.status} label={labels[row.status]??row.status}/>
                <p className="mt-1 text-xs text-muted-foreground">{sourceLabel(row.source)}</p>
              </td>
              <td className={adminTableCellClass+' whitespace-nowrap tabular-nums'}>{date(row.protectionUntil)}</td>
              <td className={adminTableCellClass+' whitespace-nowrap tabular-nums'}>
                {date(row.priorityUntil)}
                {row.status==='EXPIRED'&&<p className="text-xs text-rose-600 dark:text-rose-400">Đã kết thúc</p>}
              </td>
              <td className={adminTableCellClass+' whitespace-nowrap tabular-nums'}>
                {row.newFrom&&row.newUntil?<>{date(row.newFrom)}<span className="block text-xs text-muted-foreground">đến {date(row.newUntil)}</span></>:'—'}
              </td>
              <td className={adminTableCellClass}>
                <div className="flex justify-center gap-2">
                  <AdminIconAction icon={Eye} label={`Xem hồ sơ ${row.school}`} tone="neutral" onClick={()=>{setSelected(row);setDecision(null);}}/>
                  {mode==='sales'&&row.canRequest&&<AdminIconAction icon={Send} tone="green"
                    disabled={busy} label={`Yêu cầu xem xét ${row.school}`} onClick={()=>startDecision(row,'request')}/>}
                  {mode==='manager'&&row.canApprove&&<AdminIconAction icon={Check} tone="green"
                    disabled={busy} label={`Duyệt gia hạn ${row.school}`} onClick={()=>startDecision(row,'approve')}/>}
                  {mode==='manager'&&row.canApprove&&<AdminIconAction icon={X} tone="red"
                    disabled={busy} label={`Từ chối hồ sơ ${row.school}`} onClick={()=>startDecision(row,'reject')}/>}
                </div>
              </td>
            </tr>)}
            {!loading&&visible.length===0&&<tr><td colSpan={mode==='manager'?8:7}
              className="px-5 py-12 text-center text-sm text-muted-foreground">
              {rows.length===0?'Chưa có hồ sơ bảo vệ trong phạm vi tài khoản.':'Không có hồ sơ phù hợp bộ lọc.'}
            </td></tr>}
            {loading&&<tr><td colSpan={mode==='manager'?8:7} className="px-5 py-10 text-center text-sm text-muted-foreground">
              Đang tải dữ liệu...
            </td></tr>}
          </tbody>
        </table>
      </div>
      <AppPagination page={currentPage} pageSize={pageSize} total={total} itemLabel="hồ sơ"
        disabled={loading||busy} pageSizeOptions={pageSizeOptions}
        onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
    </AdminListPanel>

    <AppDrawer open={!!rowDetail&&!decision} onOpenChange={open=>{if(!open)setSelected(null);}}
      title="Chi tiết quyền bảo vệ" description={rowDetail?.school??''}>
      {rowDetail&&<div className="space-y-5 text-sm">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thông tin trường</p>
          <p className="mt-2 text-base font-semibold">{rowDetail.school}</p>
          <p className="mt-1 text-muted-foreground">Mã hợp đồng: {rowDetail.code}</p>
          {mode==='manager'&&<p className="mt-1">Sales: {rowDetail.owner} · {rowDetail.organization}</p>}
        </div>
        <section className="space-y-2">
          <h4 className="font-semibold">Hồ sơ và tái ký</h4>
          <AdminStatusBadge status={rowDetail.status} label={labels[rowDetail.status]??rowDetail.status}/>
          <p>Nguồn: {sourceLabel(rowDetail.source)}</p>
          <p>Hợp đồng tái ký: {rowDetail.renewalConfirmed===null?'Xem hồ sơ Kế toán':
            rowDetail.renewalConfirmed?'Kế toán đã xác nhận':'Chưa được Kế toán xác nhận'}</p>
          {rowDetail.note&&<p>Ghi chú: {rowDetail.note}</p>}
          {rowDetail.reason&&<p className="text-rose-600 dark:text-rose-400">Lý do xử lý: {rowDetail.reason}</p>}
        </section>
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4"/>Thời hạn bảo vệ</h4>
          <p>Bảo vệ cũ đến: <strong>{date(rowDetail.protectionUntil)}</strong></p>
          <p>Ưu tiên đến: <strong>{date(rowDetail.priorityUntil)}</strong></p>
          <p>Chu kỳ mới: {rowDetail.newFrom&&rowDetail.newUntil
            ?`${date(rowDetail.newFrom)} – ${date(rowDetail.newUntil)}`:'Chưa được cấp'}</p>
          {rowDetail.reviewedAt&&<p>Thời điểm xử lý: {date(rowDetail.reviewedAt)}</p>}
        </section>
        <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          Ưu tiên 15 ngày không phải gia hạn hợp đồng hoặc tự động cấp 5 năm bảo vệ mới.
        </p>
        {mode==='manager'&&rowDetail.canApprove&&<div className="flex flex-wrap gap-2">
          <AppButton type="button" tone="green" onClick={()=>setDecision('approve')}>Xác nhận 5 năm mới</AppButton>
          <AppButton type="button" tone="danger" onClick={()=>setDecision('reject')}>Từ chối</AppButton>
        </div>}
        {mode==='sales'&&rowDetail.canRequest&&<AppButton type="button" tone="green"
          onClick={()=>setDecision('request')}>Yêu cầu xem xét</AppButton>}
      </div>}
    </AppDrawer>

    <ConfirmDialog open={activeDecision?.action==='approve'}
      onOpenChange={open=>{if(!open)setDecision(null);}}
      title="Xác nhận chu kỳ bảo vệ 5 năm mới"
      description={`Kiểm tra hồ sơ tái ký đã được Kế toán xác nhận trước khi duyệt ${activeDecision?.row.school??''}. Quyết định này tạo chu kỳ bảo vệ mới.`}
      confirmLabel="Xác nhận cấp 5 năm" busy={busy}
      onConfirm={()=>{if(activeDecision)void send(activeDecision.row,'approve');}}/>

    <AppDrawer open={activeDecision?.action==='reject'||activeDecision?.action==='request'}
      onOpenChange={open=>{if(!open){setDecision(null);setReason('');}}}
      title={activeDecision?.action==='reject'?'Từ chối hồ sơ bảo vệ':'Yêu cầu xem xét bảo vệ'}
      description={activeDecision?.row.school??''}
      busy={busy}
      footer={<>
        <AppButton type="button" tone="neutral" disabled={busy} onClick={()=>{setDecision(null);setReason('');}}>Hủy</AppButton>
        <AppButton type="button" tone={activeDecision?.action==='reject'?'danger':'green'} busy={busy}
          disabled={activeDecision?.action==='reject'&&!reason.trim()}
          onClick={()=>{if(activeDecision)void send(activeDecision.row,activeDecision.action);}}>
          {activeDecision?.action==='reject'?'Xác nhận từ chối':'Gửi yêu cầu'}
        </AppButton>
      </>}>
      <label htmlFor="protection-renewal-reason" className="block text-sm font-medium">
        {activeDecision?.action==='reject'?'Lý do từ chối (bắt buộc)':'Lý do cần xem xét (không bắt buộc)'}
      </label>
      <textarea id="protection-renewal-reason" value={reason} maxLength={1000}
        onChange={e=>setReason(e.target.value)} rows={5}
        placeholder="Nhập nội dung để Quản lý xem xét..."
        className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"/>
      <p className="mt-1 text-right text-xs text-muted-foreground">{reason.length}/1000</p>
    </AppDrawer>
  </div>;
}
