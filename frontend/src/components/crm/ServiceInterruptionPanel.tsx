'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Eye, RefreshCw } from 'lucide-react';
import { channelRequest } from '@/lib/channel-operations';
import { AdminListPanel, AdminListToolbar, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { AppSelect } from '@/components/common/app-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppButton } from '@/components/common/buttons/app-button';

type Entry = {
  customer_id:number; customer_name:string; contract_id:number;
  owner_user_id:number|null; gap_start_on:string|null; threshold_on:string|null;
  next_service_start_on:string|null; protection_until:string|null; status:string;
  has_pending_renewal:boolean; has_open_dispute:boolean;
};
type List = {data:Entry[]; total:number; page:number; page_size:number};
type History = {id:number;gap_start_on:string;threshold_on:string;status:string;reason:string;processed_at:string};
type Detail = {data:{
  customerId:number; contractId:number; status:string; gapStartOn:string|null;
  thresholdOn:string|null; nextServiceStartOn:string|null;
  hasPendingRenewal:boolean; hasOpenDispute:boolean;
  protectionUntil:string|null; history:History[];
}};
const statusLabels:Record<string,string> = {
  INTERRUPTED:'Đang gián đoạn', THRESHOLD_REACHED:'Đủ 12 tháng',
  EXCEPTION_ACCOUNTING:'Chờ Kế toán', EXCEPTION_DISPUTE:'Tranh chấp',
  EXCEPTION_CONFIG_REQUIRED:'Chưa cấu hình hạn xử lý ngoại lệ',
  EXCEPTION_OVERDUE:'Ngoại lệ quá hạn, chuyển BGĐ',
  EXCEPTION_OWNERSHIP:'Cần rà soát quyền', RELEASED:'Đã mở lại',
  HISTORICALTHRESHOLDREQUIRESREVIEW:'Cần rà soát lịch sử',
  MISSINGSERVICETERM:'Thiếu thời hạn dịch vụ',
};
const date=(s:string|null)=>s ? new Date(s.slice(0,10)+'T00:00:00+07:00').toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
export function ServiceInterruptionPanel({apiBase,token,mode}:{
  apiBase:string;token:string;mode:'sales'|'manager'|'care'|'director'|'accounting';
}) {
  const [list,setList]=useState<List>({data:[],total:0,page:1,page_size:20});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [selected,setSelected]=useState<Entry|null>(null);
  const [detail,setDetail]=useState<Detail['data']|null>(null);
  const [detailError,setDetailError]=useState('');
  const load=useCallback(async()=>{
    if(!apiBase||!token)return;
    setLoading(true);setError('');
    try{
      const query=new URLSearchParams({page:String(page),pageSize:String(pageSize)});
      if(search)query.set('search',search);
      if(status!=='ALL')query.set('status',status);
      setList(await channelRequest<List>(apiBase,token,'/service-interruptions?'+query));
    }catch(e){setError(e instanceof Error?e.message:'Không thể tải danh sách gián đoạn.');}
    finally{setLoading(false);}
  },[apiBase,token,page,pageSize,search,status]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!selected){setDetail(null);return;}
    let valid=true;setDetail(null);setDetailError('');
    void channelRequest<Detail>(apiBase,token,'/service-interruptions/'+selected.customer_id)
      .then(res=>{if(valid)setDetail(res.data);})
      .catch(e=>{if(valid)setDetailError(e instanceof Error?e.message:'Không thể tải lịch sử.');});
    return()=>{valid=false;};
  },[apiBase,token,selected]);
  const reset=()=>{setDraft('');setSearch('');setStatus('ALL');setPage(1);};
  return <section className="space-y-4" aria-label="Gián đoạn dịch vụ 12 tháng">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarClock aria-hidden="true" className="size-5 text-[#1b5e20]"/>Gián đoạn dịch vụ 12 tháng
      </h3><p className="mt-1 text-sm text-muted-foreground">
        {mode==='sales'?'Theo dõi nguy cơ kết thúc quyền bảo vệ của trường phụ trách.':
         mode==='care'?'Theo dõi và chủ động chăm sóc trường sắp đủ thời gian gián đoạn.':
         'Giám sát kỳ sử dụng, trường sắp mất bảo vệ và hồ sơ cần rà soát.'}
      </p></div>
      <AppButton tone="neutral" disabled={loading} onClick={()=>void load()}>
        <RefreshCw className="mr-2 inline size-4" aria-hidden="true"/>Làm mới
      </AppButton>
    </header>
    {error&&<p role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-destructive">{error}</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}} onReset={reset}
        searchLabel="Tìm trường gián đoạn" placeholder="Tên trường hoặc mã hợp đồng..."
        filters={<AppSelect ariaLabel="Trạng thái gián đoạn" value={status}
          options={[{value:'ALL',label:'Tất cả trạng thái'},
            ...Object.entries(statusLabels).map(([value,label])=>({value,label}))]}
          onValueChange={next=>{setStatus(next);setPage(1);}}/>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass+' min-w-[830px]'}>
          <thead className={adminTableHeadClass}><tr>
            <th className="px-4 py-3">Nhà trường</th>
            <th className="px-4 py-3">Bắt đầu gián đoạn</th>
            <th className="px-4 py-3">Mốc 12 tháng</th>
            <th className="px-4 py-3">Quyền bảo vệ đến</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3 text-center">Chi tiết</th>
          </tr></thead>
          <tbody className="divide-y divide-border/70">
            {list.data.map(item=><tr key={item.customer_id}>
              <td className={adminTableCellClass}><span className="font-medium">{item.customer_name}</span>
                <p className="text-xs text-muted-foreground">Hợp đồng #{item.contract_id}</p></td>
              <td className={adminTableCellClass}>{date(item.gap_start_on)}</td>
              <td className={adminTableCellClass}>{date(item.threshold_on)}</td>
              <td className={adminTableCellClass}>{item.protection_until?new Date(item.protection_until).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—'}</td>
              <td className={adminTableCellClass}>
                <span className="inline-flex items-center gap-1">
                  {item.status.startsWith('EXCEPTION')&&<AlertTriangle className="size-4 text-amber-600"/>}
                  {statusLabels[item.status]??item.status}
                </span>
              </td>
              <td className={adminTableCellClass+' text-center'}>
                <button type="button" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={()=>setSelected(item)} aria-label={'Xem gián đoạn '+item.customer_name}>
                  <Eye className="size-4"/>Xem
                </button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {loading&&<p className="p-4 text-sm text-muted-foreground">Đang tải...</p>}
      {!loading&&!list.data.length&&<p className="p-4 text-sm text-muted-foreground">Không có trường phù hợp.</p>}
      <AppPagination page={page} pageSize={pageSize} total={list.total}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}
        pageSizeOptions={[10,20,50]} showSummary={false} disabled={loading}/>
    </AdminListPanel>
    <AppDrawer wide open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}
      title={selected?.customer_name??'Chi tiết gián đoạn'}
      description="Thời hạn dịch vụ và lịch sử quyết định">
      {detailError&&<p role="alert" className="text-sm text-destructive">{detailError}</p>}
      {!detail&&!detailError&&<p className="text-sm text-muted-foreground">Đang tải chi tiết...</p>}
      {detail&&<div className="space-y-4 text-sm">
        <p>Trạng thái: <strong>{statusLabels[detail.status]??detail.status}</strong></p>
        <p>Bắt đầu gián đoạn: {date(detail.gapStartOn)}</p>
        <p>Mốc đủ 12 tháng: {date(detail.thresholdOn)}</p>
        <p>Kỳ sử dụng tiếp theo: {date(detail.nextServiceStartOn)}</p>
        <p>Tái ký đang chờ Kế toán: {detail.hasPendingRenewal?'Có':'Không'}</p>
        <p>Tranh chấp đang mở: {detail.hasOpenDispute?'Có':'Không'}</p>
        <h4 className="font-semibold">Lịch sử xử lý</h4>
        {detail.history.length===0&&<p className="text-muted-foreground">Chưa phát sinh quyết định.</p>}
        {detail.history.map(h=><div className="rounded-lg border p-3" key={h.id}>
          <strong>{statusLabels[h.status]??h.status}</strong>
          <p>{h.reason}</p>
          <p className="text-muted-foreground">{new Date(h.processed_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</p>
        </div>)}
      </div>}
    </AppDrawer>
  </section>;
}
