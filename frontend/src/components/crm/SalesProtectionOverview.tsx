'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Clock3, Eye, FileText, History, Info, RefreshCw, ShieldCheck } from 'lucide-react';
import { channelRequest } from '@/lib/channel-operations';
import { AdminListPanel, AdminListToolbar, AdminIconAction, adminTableClass, adminTableCellClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { AppSelect } from '@/components/common/app-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppStatusBadge } from '@/components/common/app-status-badge';
import { protectionServiceStatus, protectionAction } from './protection-overview-presentation';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppButton } from '@/components/common/buttons/app-button';

type SchoolProtection = {
  customer_id:number; customer_name:string; contract_id:number; contract_code:string;
  protection_until:string|null; protection_status:string; priority_until:string|null;
  renewal_case_id:number|null; renewal_status:string; renewal_source:string|null;
  renewal_note:string|null; renewal_reason:string|null; renewal_confirmed:boolean;
  new_protection_from:string|null; new_protection_until:string|null;
  can_request:boolean; interruption_status:string; gap_start_on:string|null;
  threshold_on:string|null; next_service_start_on:string|null;
  has_pending_renewal:boolean; has_open_dispute:boolean; status:string;
};
type Result = { data:SchoolProtection[]; total:number; page:number; page_size:number };
type Event = {id:number; gap_start_on:string; threshold_on:string; status:string; reason:string; processed_at:string};
type InterruptionDetail = {data: {history:Event[]}};
const labels:Record<string,string> = {
  PROTECTED:'Đang bảo vệ', RELEASED:'Đã giải phóng', EXPIRED:'Hết bảo vệ',
  INTERRUPTED:'Đang gián đoạn', THRESHOLD_REACHED:'Đủ 12 tháng',
  WAITING_RENEWAL:'Chờ tái ký', PENDING_MANAGER:'CRM đang xử lý bảo vệ',
  APPROVED:'Đã cấp chu kỳ mới', REJECTED:'Hồ sơ bị từ chối',
  NOT_DUE:'Chưa đến kỳ', NOT_CREATED:'Đang theo dõi kỳ bảo vệ', WAITING_PROTECTION_EXPIRY:'Đang chờ đến hạn bảo vệ',
  EXCEPTION_ACCOUNTING:'Ngoại lệ Kế toán', EXCEPTION_OVERDUE:'Ngoại lệ quá hạn',
  EXCEPTION_DISPUTE:'Đang tranh chấp', EXCEPTION_OWNERSHIP:'Rà soát quyền',
  EXCEPTION_CONFIG_REQUIRED:'Chưa cấu hình hạn ngoại lệ',
  HISTORICALTHRESHOLDREQUIRESREVIEW:'Rà soát lịch sử',
  MISSINGSERVICETERM:'Thiếu kỳ dịch vụ', CONTINUOUS:'Đang sử dụng',
};
const day=(s:string|null)=>s
  ? new Date(s.length===10?s+'T00:00:00+07:00':s).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})
  :'—';

function DetailField({label,value}:{label:string;value:string}) {
  return <div className="min-w-0 space-y-1">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="break-words font-semibold tabular-nums text-foreground">{value}</dd>
  </div>;
}

export function SalesProtectionOverview({apiBase,token}:{apiBase:string;token:string}) {
  const [rows,setRows]=useState<Result>({data:[],total:0,page:1,page_size:10});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(10);
  const [selected,setSelected]=useState<SchoolProtection|null>(null);
  const [history,setHistory]=useState<Event[]>([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [detailError,setDetailError]=useState('');
  const load=useCallback(async()=>{
    if(!apiBase||!token)return;
    setLoading(true);setError('');
    try{
      const args=new URLSearchParams({page:String(page),pageSize:String(pageSize)});
      if(search)args.set('search',search);
      if(status!=='ALL')args.set('status',status);
      setRows(await channelRequest<Result>(apiBase,token,'/protection-overview?'+args));
    }catch(e){setError(e instanceof Error?e.message:'Không tải được danh sách quyền bảo vệ.');}
    finally{setLoading(false);}
  },[apiBase,token,page,pageSize,search,status]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!selected){setHistory([]);setHistoryLoading(false);return;}
    let active=true;setHistory([]);setDetailError('');setHistoryLoading(true);
    void channelRequest<InterruptionDetail>(apiBase,token,
      '/service-interruptions/'+selected.customer_id)
      .then(r=>{if(active)setHistory(r.data.history);})
      .catch(e=>{if(active)setDetailError(e instanceof Error?e.message:'Không tải được lịch sử gián đoạn.');})
      .finally(()=>{if(active)setHistoryLoading(false);});
    return()=>{active=false;};
  },[apiBase,token,selected]);
  const reset=()=>{setDraft('');setSearch('');setStatus('ALL');setPage(1);};
  return <section className="space-y-4" aria-label="Quản lý quyền bảo vệ">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-[#1b5e20]" aria-hidden="true"/>Quản lý quyền bảo vệ</h2>
        <p className="mt-1 text-sm text-muted-foreground">Theo dõi bảo vệ 5 năm, tái ký và gián đoạn 12 tháng trên cùng một danh sách.</p>
      </div>
      <AppButton tone="neutral" disabled={loading} leadingIcon={<RefreshCw className="size-4"/>} onClick={()=>void load()}>Làm mới</AppButton>
    </header>
    {error&&<p role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-destructive">{error}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}} onReset={reset}
        searchLabel="Tìm trường hoặc mã hợp đồng" placeholder="Tên trường hoặc mã hợp đồng..."
        filters={<AppSelect ariaLabel="Lọc tình trạng bảo vệ" className="w-full sm:w-52"
          value={status} options={[{value:'ALL',label:'Tất cả trạng thái'},
            ...Object.entries(labels).map(([value,label])=>({value,label}))]}
          onValueChange={next=>{setStatus(next);setPage(1);}}/>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass+' min-w-[900px]'}>
          <thead className={adminTableHeadClass}><tr>
            <th className="px-5 py-4">Nhà trường</th>
            <th className="px-4 py-4">Bảo vệ đến</th>
            <th className="px-4 py-4">Tình trạng dịch vụ</th>
            <th className="px-4 py-4">Cần xử lý</th>
            <th className="px-5 py-4 text-center">Thao tác</th>
          </tr></thead>
          <tbody className="divide-y divide-border/70">
            {rows.data.map(row=><tr key={row.customer_id} className="even:bg-muted/20 hover:bg-muted/40">
              <td className={adminTableCellClass}><p className="font-semibold">{row.customer_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.contract_code}</p></td>
              <td className={adminTableCellClass+' whitespace-nowrap tabular-nums'}>{day(row.protection_until)}</td>
              <td className={adminTableCellClass}>
                <AppStatusBadge status={protectionServiceStatus(row)}
                  label={labels[protectionServiceStatus(row)]??protectionServiceStatus(row)}/>
              </td>
              <td className={adminTableCellClass}>
                {protectionAction(row) ? <AppStatusBadge status={protectionAction(row)!.status}
                    label={protectionAction(row)!.label}/> :
                  <span className="text-muted-foreground" aria-label="Không có việc cần xử lý">—</span>}
              </td>
              <td className={adminTableCellClass}>
                <div className="flex justify-center gap-2">
                  <AdminIconAction icon={Eye} label={'Xem quyền bảo vệ '+row.customer_name}
                    tone="neutral" onClick={()=>setSelected(row)}/>

                </div>
              </td>
            </tr>)}
            {!loading&&rows.data.length===0&&<tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
              {error?'Không tải được dữ liệu.':'Chưa có trường phù hợp trong phạm vi tài khoản.'}
            </td></tr>}
            {loading&&<tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Đang tải danh sách...</td></tr>}
          </tbody>
        </table>
      </div>
      <AppPagination page={page} pageSize={pageSize} total={rows.total}
        pageSizeOptions={[10,20,50]} itemLabel="trường" showSummary={false} disabled={loading}
        onPageChange={setPage} onPageSizeChange={v=>{setPageSize(v);setPage(1);}}/>
    </AdminListPanel>
    <AppDrawer wide open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}
      title="Chi tiết quyền bảo vệ" description={selected?.customer_name??''}
      bodyClassName="bg-muted/15">
      {selected&&<div className="space-y-4 pb-2 text-sm">
        <section aria-label="Tổng quan quyền bảo vệ" className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quyền bảo vệ trường học</p>
              <h3 className="mt-1 text-lg font-bold leading-snug text-foreground">{selected.customer_name}</h3>
              <p className="mt-1 break-all text-xs text-muted-foreground">Hợp đồng: {selected.contract_code}</p>
            </div>
            <AppStatusBadge status={selected.protection_status} label={labels[selected.protection_status]??selected.protection_status}/>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Bảo vệ hiện tại đến</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{day(selected.protection_until)}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Ưu tiên Sales cũ đến</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{day(selected.priority_until)}</p>
            </div>
          </div>
          <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0"/>
            Ưu tiên 15 ngày là khoảng xem xét của Sales cũ sau mốc bảo vệ, không gia hạn quyền bảo vệ.
          </p>
        </section>

        {protectionAction(selected)&&<section aria-label="Việc cần theo dõi" className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/30">
          <Clock3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300"/>
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-sky-950 dark:text-sky-100">Cần theo dõi</p>
            <AppStatusBadge status={protectionAction(selected)!.status} label={protectionAction(selected)!.label}/>
            <p className="text-xs leading-relaxed text-sky-900/80 dark:text-sky-200">Đây là trạng thái xử lý từ CRM, không đồng nghĩa quyền bảo vệ đã bị giải phóng.</p>
          </div>
        </section>}

        <section aria-labelledby="sales-protection-service-heading" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="sales-protection-service-heading" className="flex items-center gap-2 font-bold text-foreground"><CalendarClock aria-hidden="true" className="size-4 text-primary"/>Tình trạng sử dụng dịch vụ</h3>
            <AppStatusBadge status={protectionServiceStatus(selected)} label={labels[protectionServiceStatus(selected)]??protectionServiceStatus(selected)}/>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Mốc gián đoạn 12 tháng được theo dõi độc lập với thời hạn bảo vệ 5 năm.</p>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailField label="Bắt đầu gián đoạn" value={day(selected.gap_start_on)}/>
            <DetailField label="Mốc đủ 12 tháng" value={day(selected.threshold_on)}/>
            <DetailField label="Kỳ sử dụng tiếp theo" value={day(selected.next_service_start_on)}/>
            <DetailField label="Hồ sơ tái ký tại Kế toán" value={selected.has_pending_renewal?'Đang chờ xác nhận':'Không có hồ sơ chờ'}/>
            <DetailField label="Tranh chấp quyền" value={selected.has_open_dispute?'Có tranh chấp cần xử lý':'Không có tranh chấp'}/>
          </dl>
        </section>

        <section aria-labelledby="sales-protection-renewal-heading" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="sales-protection-renewal-heading" className="flex items-center gap-2 font-bold text-foreground"><ShieldCheck aria-hidden="true" className="size-4 text-primary"/>Chu kỳ bảo vệ tiếp theo</h3>
            <AppStatusBadge status={selected.renewal_status} label={labels[selected.renewal_status]??selected.renewal_status}/>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Tái ký phần mềm hằng năm không tự cộng thêm 5 năm bảo vệ Sales.</p>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailField label="Kế toán xác nhận kỳ tiếp tục" value={selected.renewal_confirmed?'Đã xác nhận':'Chưa xác nhận'}/>
            <DetailField label="Nguồn hồ sơ" value={selected.renewal_source==='AUTO'?'CRM tự tính':selected.renewal_source==='MANUAL'?'Hồ sơ trước chuyển đổi':'Chưa phát sinh'}/>
            {selected.new_protection_from&&selected.new_protection_until&&<>
              <DetailField label="Bảo vệ mới từ" value={day(selected.new_protection_from)}/>
              <DetailField label="Bảo vệ mới đến" value={day(selected.new_protection_until)}/>
            </>}
          </dl>
          {selected.renewal_note&&<div className="mt-4 rounded-lg bg-muted/40 p-3"><p className="text-xs font-semibold text-muted-foreground">Ghi chú hồ sơ</p><p className="mt-1 whitespace-pre-wrap break-words">{selected.renewal_note}</p></div>}
          {selected.renewal_reason&&<div className="mt-3 rounded-lg bg-muted/40 p-3"><p className="text-xs font-semibold text-muted-foreground">Lý do xử lý</p><p className="mt-1 whitespace-pre-wrap break-words">{selected.renewal_reason}</p></div>}
        </section>

        <section aria-labelledby="sales-protection-history-heading" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 id="sales-protection-history-heading" className="flex items-center gap-2 font-bold text-foreground"><History aria-hidden="true" className="size-4 text-primary"/>Lịch sử gián đoạn và quyết định</h3>
          {historyLoading&&<p role="status" className="mt-3 text-sm text-muted-foreground">Đang tải lịch sử xử lý...</p>}
          {detailError&&<p role="alert" className="mt-3 text-sm text-destructive">{detailError}</p>}
          {!historyLoading&&!detailError&&history.length===0&&<div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/40 p-3">
            <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground"/>
            <p className="text-sm text-muted-foreground">Chưa có sự kiện gián đoạn GI-01 được ghi nhận.</p>
          </div>}
          {!historyLoading&&history.length>0&&<ol className="mt-4 space-y-4 border-l-2 border-border pl-4">
            {history.map(h=><li key={h.id} className="space-y-1.5">
              <p className="text-xs tabular-nums text-muted-foreground">{day(h.processed_at)}</p>
              <AppStatusBadge status={h.status} label={labels[h.status]??h.status}/>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{h.reason}</p>
              {h.gap_start_on&&<p className="text-xs text-muted-foreground">Gián đoạn từ {day(h.gap_start_on)} · Mốc 12 tháng: {day(h.threshold_on)}</p>}
            </li>)}
          </ol>}
        </section>
        <p className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          Các trạng thái, mốc thời gian và quyết định được lấy từ CRM. Đạt mốc gián đoạn 12 tháng không đồng nghĩa tự động giải phóng quyền bảo vệ.
        </p>
      </div>}
    </AppDrawer>
  </section>;
}
