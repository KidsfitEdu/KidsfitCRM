'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { Eye, Plus, RotateCcw, Search } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppPagination } from '@/components/common/app-pagination';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppButton } from '@/components/common/buttons/app-button';
import { appNotice } from '@/components/common/app-toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

type Eligible = {id:number;contract_code:string;school_name:string;
  source_end_on:string|null;latest_end_on:string|null;pending:boolean};
type Renewal = {id:number;renewal_no:number;signed_on:string;service_start_on:string;
  service_end_on:string;payment_cycle:string;total_value:number;status:string;
  decision_reason:string|null;gap_reason:string|null;submitted_at:string|null};
type DrawerMode = 'create' | 'resubmit' | 'detail' | null;
const statuses: Record<string,string> = {
  PENDING_ACCOUNTING:'Đang chờ Kế toán', NEEDS_INFO:'Cần bổ sung', CONFIRMED:'Đã xác nhận', REJECTED:'Đã từ chối'
};
const statusTone: Record<string,string> = {
  CONFIRMED:'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300',
  PENDING_ACCOUNTING:'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  NEEDS_INFO:'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300',
  REJECTED:'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
};
const calendarYearEnd = (value:string) => {
  const [year,month,day] = value.split('-').map(Number);
  if(!year||!month||!day)return '';
  const anniversaryDay = Math.min(day,new Date(Date.UTC(year+1,month,0)).getUTCDate());
  const end = new Date(Date.UTC(year+1,month-1,anniversaryDay-1));
  return end.toISOString().slice(0,10);
};
const localDay = () => new Intl.DateTimeFormat('sv-SE',{
  timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'
}).format(new Date());

export function ContractRenewalSalesPanel({apiBase,token,abilities}:{apiBase:string;token:string;abilities:string[]}) {
  const [eligible,setEligible]=useState<Eligible[]>([]);
  const [contractId,setContractId]=useState('');
  const [rows,setRows]=useState<Renewal[]>([]);
  const [loading,setLoading]=useState(false);
  const [listError,setListError]=useState(false);
  const [revision,setRevision]=useState(0);
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState('');
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [drawer,setDrawer]=useState<DrawerMode>(null);
  const [activeId,setActiveId]=useState<number|null>(null);
  const [signedOn,setSignedOn]=useState(localDay());
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [cycle,setCycle]=useState('YEARLY');
  const [amount,setAmount]=useState('');
  const [gapReason,setGapReason]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [fileRevision,setFileRevision]=useState(0);
  const canSubmit=abilities.includes('channel_sales.renewal.submit')||abilities.includes('*');
  const connected=Boolean(apiBase&&token);
  const load=useCallback(async()=>{
    if(!connected||!canSubmit)return;
    try{
      const result=await channelRequest<{data:Eligible[]}>(apiBase,token,'/renewals/eligible');
      setEligible(result.data);
    }catch(e){appNotice.error('Không tải được danh sách hợp đồng được phép tái ký.',e instanceof Error?e.message:'Vui lòng thử lại.');}
  },[apiBase,token,connected,canSubmit]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!contractId){setRows([]);setListError(false);return;}
    let live=true;
    setLoading(true);
    setListError(false);
    void channelRequest<{data:Renewal[]}>(apiBase,token,`/contracts/${contractId}/renewals`)
      .then(result=>{if(live)setRows(result.data);})
      .catch(()=>{if(live){setRows([]);setListError(true);}})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[apiBase,token,contractId,revision]);

  const selected=eligible.find(x=>String(x.id)===contractId);
  const selectedRenewal=rows.find(r=>r.id===activeId);
  const previousEnd=selected?.latest_end_on??selected?.source_end_on??null;
  const expectedNext=previousEnd?new Date(Date.parse(previousEnd.slice(0,10)+'T00:00:00Z')+86400000).toISOString().slice(0,10):null;
  const gapDetected=Boolean(expectedNext&&start>expectedNext);
  const allFiltered=rows.filter(r=>{
    if(status!=='ALL'&&r.status!==status)return false;
    if(!query)return true;
    const keyword=query.toLocaleLowerCase('vi-VN');
    return [selected?.school_name,selected?.contract_code,String(r.renewal_no),statuses[r.status]]
      .some(value=>(value??'').toLocaleLowerCase('vi-VN').includes(keyword));
  });
  const lastPage=Math.max(1,Math.ceil(allFiltered.length/pageSize));
  const visible=allFiltered.slice((Math.min(page,lastPage)-1)*pageSize,Math.min(page,lastPage)*pageSize);

  const resetForm=()=>{
    setSignedOn(localDay());setStart('');setEnd('');setCycle('YEARLY');
    setAmount('');setGapReason('');setFile(null);setFileRevision(x=>x+1);
  };
  const openCreate=()=>{
    resetForm();setActiveId(null);setDrawer('create');
  };
  const openResubmit=(r:Renewal)=>{
    resetForm();
    setActiveId(r.id);setSignedOn(r.signed_on.slice(0,10));
    setStart(r.service_start_on.slice(0,10));setEnd(r.service_end_on.slice(0,10));
    setCycle(r.payment_cycle);setAmount(String(r.total_value));
    setGapReason(r.gap_reason??'');setDrawer('resubmit');
  };
  const changeContract=(value:string)=>{
    if(saving)return;
    setContractId(value);setDrawer(null);setActiveId(null);
    setRows([]);setSearch('');setQuery('');setStatus('ALL');setPage(1);
  };
  const send=async(e:SyntheticEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!selected||!file||!start||!end||!signedOn||!amount){appNotice.error('Vui lòng nhập đầy đủ thông tin và hợp đồng đã ký.');return;}
    if(end!==calendarYearEnd(start)){appNotice.error('Kỳ tái ký phải đủ một năm lịch tính từ ngày bắt đầu.');return;}
    if(!previousEnd){appNotice.error('Hợp đồng nguồn chưa có hạn dịch vụ được xác minh.');return;}
    if(start<=previousEnd.slice(0,10)){appNotice.error('Ngày bắt đầu phải sau ngày kết thúc kỳ liền trước.');return;}
    if(gapDetected&&!gapReason.trim()){appNotice.error('Vui lòng nhập lý do khoảng trống giữa hai kỳ dịch vụ.');return;}
    if(drawer==='resubmit'&&!activeId){appNotice.error('Không tìm thấy hồ sơ cần bổ sung.');return;}
    setSaving(true);
    try{
      const form=new FormData();form.set('kind','RENEWAL');form.set('file',file);
      const proof=await channelRequest<{data:{id:number}}>(apiBase,token,'/evidence',{method:'POST',body:form});
      const payload={idempotency_key:crypto.randomUUID(),signed_on:signedOn,
        service_start_on:start,service_end_on:end,payment_cycle:cycle,total_value:Number(amount),
        gap_reason:gapDetected?gapReason.trim():null,evidence_id:proof.data.id};
      await channelRequest(apiBase,token,drawer==='resubmit'?`/renewals/${activeId}/resubmit`:`/contracts/${contractId}/renewals`,
        {method:'POST',body:JSON.stringify(payload)});
      appNotice.success('Đã gửi hồ sơ tái ký trực tiếp Kế toán.');
      setDrawer(null);setActiveId(null);resetForm();
      await load();setRevision(v=>v+1);
    }catch(err){appNotice.error('Không gửi được hồ sơ tái ký.',err instanceof Error?err.message:'Vui lòng thử lại.');}
    finally{setSaving(false);}
  };
  if(!canSubmit||!connected)return <p role="alert" className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
    {!canSubmit?'Tài khoản chưa có quyền gửi tái ký.':'Cần đăng nhập để xem hồ sơ tái ký.'}
  </p>;
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">Theo dõi và gửi hợp đồng tái ký trực tiếp cho Kế toán. Không tự kéo dài quyền bảo vệ Sales 5 năm.</p>
      <AppButton tone="green" type="button" leadingIcon={<Plus className="size-4"/>}
        onClick={openCreate} disabled={eligible.length===0}>Tạo hồ sơ tái ký</AppButton>
    </div>
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card" aria-label="Danh sách hồ sơ tái ký Sales">
      <form className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4 sm:px-5"
        onSubmit={event=>{event.preventDefault();setQuery(search.trim());setPage(1);}}>
        <div className="relative min-w-0 basis-full md:min-w-[180px] md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <Input aria-label="Tìm hồ sơ tái ký" className="h-11 w-full rounded-xl pl-10"
            placeholder="Tên trường, mã hợp đồng, kỳ tái ký..." value={search} onChange={event=>setSearch(event.target.value)}/>
        </div>
        <AppNativeSelect aria-label="Lọc theo hợp đồng" containerClassName="w-full md:w-56" value={contractId}
          onChange={event=>changeContract(event.target.value)}>
          <option value="">Chọn trường / hợp đồng</option>
          {eligible.map(x=><option value={x.id} key={x.id}>{x.school_name} · {x.contract_code}</option>)}
        </AppNativeSelect>
        <AppNativeSelect aria-label="Lọc theo trạng thái" containerClassName="w-full md:w-44" value={status}
          onChange={event=>{setStatus(event.target.value);setPage(1);}}>
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(statuses).map(([key,value])=><option key={key} value={key}>{value}</option>)}
        </AppNativeSelect>
        <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
        <AppButton type="button" tone="outline" size="icon-lg" className="h-11 w-11 min-w-11 rounded-lg p-0"
          aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={()=>{setSearch('');setQuery('');setStatus('ALL');setPage(1);}}>
          <RotateCcw className="size-4"/>
        </AppButton>
      </form>
      <div className="overflow-x-auto" aria-busy={loading}>
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-[#1b5e20] text-xs font-bold uppercase tracking-[.04em] text-white">
            <tr>
              <th scope="col" className="px-5 py-3">Nhà trường / Hợp đồng gốc</th>
              <th scope="col" className="px-4 py-3">Kỳ tái ký</th>
              <th scope="col" className="px-4 py-3 text-right">Giá trị</th>
              <th scope="col" className="px-4 py-3">Trạng thái</th>
              <th scope="col" className="px-5 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {!loading&&!listError&&visible.map(r=><tr key={r.id} className="transition-colors even:bg-muted/20 hover:bg-muted/40">
              <td className="px-5 py-4">
                <p className="font-semibold">{selected?.school_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selected?.contract_code} · Lần {r.renewal_no}</p>
              </td>
              <td className="px-4 py-4">{channelDate(r.service_start_on)} – {channelDate(r.service_end_on)}
                <p className="mt-1 text-xs text-muted-foreground">{r.payment_cycle==='MONTHLY'?'Thanh toán theo tháng':'Thanh toán theo năm'}</p>
              </td>
              <td className="px-4 py-4 text-right tabular-nums font-medium">{channelMoney(r.total_value)}</td>
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusTone[r.status]??'border-border bg-muted text-muted-foreground'}`}>
                  {statuses[r.status]??r.status}
                </span>
              </td>
              <td className="px-5 py-4 text-center">
                <Button variant="outline" type="button" size="icon" aria-label={`Xem hồ sơ lần ${r.renewal_no}`}
                  onClick={()=>{setActiveId(r.id);setDrawer('detail');}}><Eye className="size-4"/></Button>
              </td>
            </tr>)}
          </tbody>
        </table>
        {loading&&<output className="block p-10 text-center text-sm text-muted-foreground">Đang tải hồ sơ tái ký...</output>}
        {!loading&&listError&&<div className="space-y-3 p-8 text-center text-sm" role="alert">
          <p>Không tải được hồ sơ tái ký.</p>
          <Button variant="outline" type="button" onClick={()=>setRevision(v=>v+1)}>Thử lại</Button>
        </div>}
        {!loading&&!listError&&(!contractId||allFiltered.length===0)&&<p className="p-10 text-center text-sm text-muted-foreground">
          {!contractId?'Chọn trường / hợp đồng để xem lịch sử tái ký.':'Không có hồ sơ phù hợp bộ lọc.'}
        </p>}
      </div>
      <AppPagination page={Math.min(page,lastPage)} pageSize={pageSize} total={allFiltered.length}
        disabled={loading} showSummary={false} itemLabel="hồ sơ" pageSizeOptions={[10,20,50]}
        onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
    </section>
    <AppDrawer open={drawer==='detail'} onOpenChange={open=>{if(!open){setDrawer(null);setActiveId(null);}}}
      title="CHI TIẾT HỒ SƠ TÁI KÝ" description="Thông tin và kết quả xử lý hợp đồng tái ký">
      {!selectedRenewal?<p className="text-sm text-muted-foreground">Không tìm thấy hồ sơ.</p>:<div className="space-y-5 text-sm">
        <div>
          <h2 className="text-lg font-bold">{selected?.school_name}</h2>
          <p className="text-muted-foreground">{selected?.contract_code} · Lần {selectedRenewal.renewal_no}</p>
        </div>
        <section className="space-y-2 rounded-lg border border-border p-4">
          <h3 className="font-semibold">Kỳ dịch vụ đề xuất</h3>
          <p>Ngày ký: {channelDate(selectedRenewal.signed_on)}</p>
          <p>Thời hạn: {channelDate(selectedRenewal.service_start_on)} – {channelDate(selectedRenewal.service_end_on)}</p>
          <p>Giá trị: {channelMoney(selectedRenewal.total_value)}</p>
          <p>Chu kỳ: {selectedRenewal.payment_cycle==='MONTHLY'?'Theo tháng':'Theo năm'}</p>
          <p>Trạng thái: <strong>{statuses[selectedRenewal.status]??selectedRenewal.status}</strong></p>
          {selectedRenewal.decision_reason&&<p className="rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Phản hồi Kế toán: {selectedRenewal.decision_reason}</p>}
          {selectedRenewal.gap_reason&&<p>Lý do gián đoạn: {selectedRenewal.gap_reason}</p>}
        </section>
        {selectedRenewal.status==='NEEDS_INFO'&&<Button type="button"
          onClick={()=>openResubmit(selectedRenewal)}>Bổ sung hồ sơ này</Button>}
      </div>}
    </AppDrawer>
    <AppDrawer wide open={drawer==='create'||drawer==='resubmit'} busy={saving}
      onOpenChange={open=>{if(!open){setDrawer(null);setActiveId(null);resetForm();}}}
      title={drawer==='resubmit'?'BỔ SUNG HỒ SƠ TÁI KÝ':'TẠO HỒ SƠ TÁI KÝ'}
      description="Gửi hợp đồng đã ký trực tiếp cho Kế toán">
      <form id="kc02-sales-renewal-form" className="space-y-5" onSubmit={send}>
        <p className="text-sm text-muted-foreground">Kỳ tái ký một năm lịch; gián đoạn giữa hai kỳ phải có lý do.</p>
        <label htmlFor="kc02-contract" className="block space-y-1 text-sm">
          <span className="font-medium">Hợp đồng được phép tái ký *</span>
          <AppNativeSelect id="kc02-contract" containerClassName="mt-1 w-full" value={contractId}
            disabled={drawer==='resubmit'||saving} required onChange={e=>changeContractForForm(e.target.value)}>
            <option value="">Chọn hợp đồng...</option>
            {eligible.map(x=><option key={x.id} value={x.id}>{x.school_name} · {x.contract_code}</option>)}
          </AppNativeSelect>
        </label>
        {selected&&<div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
          <p>Kỳ gần nhất kết thúc: <strong>{previousEnd?channelDate(previousEnd):'Chưa có hạn dịch vụ từ KC-01'}</strong></p>
          {selected.pending&&drawer==='create'&&<p className="text-amber-700">Có hồ sơ đang chờ xử lý, không thể tạo hồ sơ trùng.</p>}
        </div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="kc02-signed" className="space-y-1 text-sm">Ngày ký *<Input id="kc02-signed" type="date" required value={signedOn} onChange={e=>setSignedOn(e.target.value)}/></label>
          <label htmlFor="kc02-start" className="space-y-1 text-sm">Ngày bắt đầu dịch vụ *<Input id="kc02-start" type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label>
          <label htmlFor="kc02-end" className="space-y-1 text-sm">Ngày kết thúc theo hợp đồng *<Input id="kc02-end" type="date" required value={end} onChange={e=>setEnd(e.target.value)}/></label>
          <label htmlFor="kc02-cycle" className="space-y-1 text-sm">Chu kỳ thanh toán *
            <AppNativeSelect id="kc02-cycle" containerClassName="mt-1 w-full" value={cycle} onChange={e=>setCycle(e.target.value)}>
              <option value="MONTHLY">Theo tháng</option><option value="YEARLY">Theo năm</option>
            </AppNativeSelect>
          </label>
          <label htmlFor="kc02-amount" className="space-y-1 text-sm">Giá trị kỳ tái ký (VNĐ) *<Input id="kc02-amount" type="number" min="1" step="1" required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
          <label htmlFor="kc02-file" className="space-y-1 text-sm">File hợp đồng đã ký (PDF hoặc ảnh, tối đa 5 MB) *
            <Input key={fileRevision} id="kc02-file" type="file" accept=".pdf,image/jpeg,image/png,image/webp" required
              onChange={e=>setFile(e.target.files?.[0]??null)}/>
          </label>
        </div>
        {gapDetected&&<label htmlFor="kc02-gap-reason" className="block space-y-1 text-sm">
          Lý do khoảng trống giữa hai kỳ dịch vụ *
          <Input id="kc02-gap-reason" required maxLength={1000} value={gapReason}
            placeholder="Ví dụ: Nhà trường tạm ngừng sử dụng trước khi tái ký"
            onChange={e=>setGapReason(e.target.value)}/>
        </label>}
        <p className="text-xs text-muted-foreground">Không tự thay đổi quyền bảo vệ Sales, doanh thu, lịch thu hoặc hoa hồng.</p>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" type="button" disabled={saving} onClick={()=>{setDrawer(null);resetForm();}}>Hủy</Button>
          <Button disabled={saving||!selected||(drawer==='create'&&selected.pending)} type="submit">
            {saving?'Đang gửi...':drawer==='resubmit'?'Gửi bổ sung':'Gửi trực tiếp Kế toán'}
          </Button>
        </div>
      </form>
    </AppDrawer>
  </div>;

  function changeContractForForm(value:string){
    if(saving)return;
    setContractId(value);
    setRows([]);setActiveId(null);
    setStart('');setEnd('');setGapReason('');
    setSearch('');setQuery('');setStatus('ALL');setPage(1);
  }
}
