'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Eye, RefreshCw, ShieldCheck } from 'lucide-react';
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
    if(!selected){setHistory([]);return;}
    let active=true;setHistory([]);setDetailError('');
    void channelRequest<InterruptionDetail>(apiBase,token,
      '/service-interruptions/'+selected.customer_id)
      .then(r=>{if(active)setHistory(r.data.history);})
      .catch(e=>{if(active)setDetailError(e instanceof Error?e.message:'Không tải được lịch sử gián đoạn.');});
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
      title="Chi tiết quyền bảo vệ" description={selected?.customer_name??''}>
      {selected&&<div className="space-y-5 text-sm">
        <section className="rounded-xl border p-4">
          <h3 className="font-semibold">Trường và hợp đồng</h3>
          <p className="mt-2">{selected.customer_name} · {selected.contract_code}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2"><span>Trạng thái bảo vệ:</span><AppStatusBadge status={selected.protection_status} label={labels[selected.protection_status]??selected.protection_status}/></div>
          <p>Bảo vệ đến: {day(selected.protection_until)}</p>
          <p>Ưu tiên Sales cũ đến: {day(selected.priority_until)}</p>
          {selected.new_protection_from&&selected.new_protection_until&&<p>Chu kỳ bảo vệ mới: {day(selected.new_protection_from)} – {day(selected.new_protection_until)}</p>}
        </section>
        <section className="space-y-2 rounded-xl border p-4">
          <h3 className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4"/>Gián đoạn dịch vụ 12 tháng</h3>
          <div className="flex flex-wrap items-center gap-2"><span>Trạng thái:</span><AppStatusBadge status={selected.interruption_status} label={labels[selected.interruption_status]??selected.interruption_status}/></div>
          <p>Bắt đầu gián đoạn: {day(selected.gap_start_on)}</p>
          <p>Mốc 12 tháng: {day(selected.threshold_on)}</p>
          <p>Kỳ sử dụng tiếp theo: {day(selected.next_service_start_on)}</p>
          <p>Đang chờ Kế toán: {selected.has_pending_renewal?'Có':'Không'}</p>
          <p>Tranh chấp: {selected.has_open_dispute?'Có':'Không'}</p>
        </section>
        <section className="space-y-2 rounded-xl border p-4">
          <h3 className="font-semibold">Kết quả bảo vệ tự động</h3>
          <div className="flex flex-wrap items-center gap-2"><span>Trạng thái:</span><AppStatusBadge status={selected.renewal_status} label={labels[selected.renewal_status]??selected.renewal_status}/></div>
          <p>Nguồn xử lý: {selected.renewal_source==='AUTO'?'CRM tự tính':selected.renewal_source==='MANUAL'?'Hồ sơ trước chuyển đổi':'Chưa phát sinh'}</p>
          <p>Kế toán đã xác nhận kỳ tiếp tục: {selected.renewal_confirmed?'Có':'Chưa'}</p>
          {selected.renewal_note&&<p>Ghi chú: {selected.renewal_note}</p>}
          {selected.renewal_reason&&<p>Lý do xử lý: {selected.renewal_reason}</p>}

        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">Lịch sử gián đoạn và quyết định</h3>
          {detailError&&<p role="alert" className="text-destructive">{detailError}</p>}
          {!detailError&&history.length===0&&<p className="text-muted-foreground">Chưa có sự kiện GI-01 được ghi nhận.</p>}
          {history.map(h=><div key={h.id} className="rounded-lg border p-3">
            <AppStatusBadge status={h.status} label={labels[h.status]??h.status}/>
            <p>{h.reason}</p>
            <p className="text-xs text-muted-foreground">{day(h.processed_at)}</p>
          </div>)}
        </section>
        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">Thời hạn ưu tiên 15 ngày không kéo dài bảo vệ. CRM chỉ tạo chu kỳ mới khi hợp đồng tái ký đã được Kế toán xác nhận và đáp ứng đầy đủ điều kiện.</p>
      </div>}
    </AppDrawer>
  </section>;
}
