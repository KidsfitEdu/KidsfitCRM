'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, RotateCcw, Search } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppPagination } from '@/components/common/app-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

type Row = { contract_id:number; contract_code:string; school_name:string;
  commission:number; paid:number; unpaid:number; entries:number };
type Payout = {id:number;code:string;period:string;amount:number;status:string;paid_at:string|null;payment_reference:string|null};
type Income = {period:string;page:number;page_size:number;total:number;
  summary:{accrued:number;paid:number;unpaid:number;contracts:number};
  data:Row[];payouts:Payout[]};
type IncomeDetail = {
  contract:{contract_code:string;school_name:string;contract_value:number;contract_status:string};
  reconciliation_status:string|null;
  ledger:{id:number;entry_type:string;amount:number;calculation_base:number;
    rate_percent:number;policy_code:string;period:string;occurred_at:string;reason:string|null}[];
  receipts:{id:number;amount:number;received_at:string;reference_code:string}[];
  payments:{id:number;code:string;period:string;status:string;paid_at:string|null;
    payment_reference:string|null;allocated_amount:number;evidence_id:number|null;evidence_name:string|null}[];
};
const statusLabel: Record<string,string> = {
  DRAFT:'Chờ duyệt', APPROVED:'Chờ chuyển', PAID:'Đã chuyển'
};

export function SalesIncomePage({apiBase,token,abilities}:{
  apiBase:string;token:string;abilities:string[];
}) {
  const [period,setPeriod]=useState('ALL');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [search,setSearch]=useState('');
  const [term,setTerm]=useState('');
  const [selected,setSelected]=useState<Row|null>(null);
  const [detail,setDetail]=useState<IncomeDetail|null>(null);
  const [detailError,setDetailError]=useState('');
  const [proofError,setProofError]=useState('');
  const openProof=async(id:number,name:string)=>{
    setProofError('');
    const tab=window.open('','_blank');
    if(!tab){setProofError('Trình duyệt đang chặn cửa sổ mới.');return;}
    try{
      const response=await fetch(`${apiBase}/channel-sales/evidence/${id}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      if(!response.ok)throw new Error('Không có quyền mở chứng từ hoặc chứng từ không tồn tại.');
      const bytes=await response.blob();
      const ext=name.toLowerCase().split('.').pop();
      const mime=ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';
      const url=URL.createObjectURL(new Blob([bytes],{type:mime}));
      tab.location.replace(url);
      window.addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
    }catch(error){tab.close();setProofError(error instanceof Error?error.message:'Không thể mở chứng từ.');}
  };
  const [data,setData]=useState<Income|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const permitted=abilities.includes('channel_sales.commission.view')||abilities.includes('*');
  const load=useCallback(async()=>{
    if(!apiBase || !token || !permitted)return;
    setLoading(true);setError('');
    try{
      const qs=new URLSearchParams({period,page:String(page),pageSize:String(pageSize)});
      if(term)qs.set('search',term);
      setData(await channelRequest<Income>(apiBase,token,`/income/me?${qs.toString()}`));
    }catch(e){setError(e instanceof Error?e.message:'Không tải được thu nhập.');setData(null);}
    finally{setLoading(false);}
  },[apiBase,token,permitted,page,pageSize,period,term]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!selected||!permitted||!apiBase||!token){setDetail(null);return;}
    let active=true;setDetail(null);setDetailError('');
    const q=new URLSearchParams({period});
    void channelRequest<IncomeDetail>(apiBase,token,`/income/me/contracts/${selected.contract_id}?${q}`)
      .then(value=>{if(active)setDetail(value);})
      .catch(cause=>{if(active)setDetailError(cause instanceof Error?cause.message:'Không tải được chi tiết hoa hồng.');});
    return()=>{active=false;};
  },[selected,permitted,apiBase,token,period]);
  const rows=data?.data??[];
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BÁN HÀNG / KIDSFIT CRM" title="Thu nhập"
      description="Theo dõi hoa hồng cá nhân theo hợp đồng và lịch sử chi trả."/>
    {!permitted && <p role="alert" className="rounded-lg border p-4 text-sm">Tài khoản chưa có quyền xem hoa hồng.</p>}
    {permitted && <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Kỳ hoa hồng
          <select aria-label="Kỳ hoa hồng" value={period}
            onChange={event=>{setPeriod(event.target.value);setPage(1);}}
            className="ml-2 h-10 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="ALL">Tất cả các kỳ</option>
            {Array.from({length:24},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);
              const value=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
              return <option key={value} value={value}>Tháng {String(d.getMonth()+1).padStart(2,'0')}/{d.getFullYear()}</option>;
            })}
          </select>
        </label>
        <Button variant="outline" size="icon" title="Tải lại" aria-label="Tải lại thu nhập" onClick={()=>void load()}><RotateCcw className="size-4"/></Button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ['Tổng hoa hồng',data?.summary.accrued??0],
          ['Đã nhận',data?.summary.paid??0],
          ['Chưa nhận',data?.summary.unpaid??0],
          ['Hợp đồng có hoa hồng',data?.summary.contracts??0]
        ].map(([label,value],i)=><div key={String(label)} className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-xl font-bold tabular-nums">{i===3?value:channelMoney(Number(value))}</p>
        </div>)}
      </div>
      <p className="text-xs text-muted-foreground">Chưa nhận có thể gồm khoản chưa đối soát, chờ duyệt hoặc chờ chuyển. Tiền đã nhận của phiếu chi nhiều hợp đồng được phân bổ theo tỷ trọng bút toán, sau khấu trừ.</p>
      <section className="overflow-hidden rounded-xl border bg-card">
        <form className="flex flex-wrap items-center gap-2 border-b p-4" onSubmit={e=>{e.preventDefault();setTerm(search.trim());setPage(1);}}>
          <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
            <Input aria-label="Tìm tên trường hoặc hợp đồng" placeholder="Tên trường, mã hợp đồng..." value={search}
              onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
          <Button type="submit">Tìm kiếm</Button>
          <Button type="button" variant="outline" onClick={()=>{setTerm('');setSearch('');setPage(1);}}>Đặt lại</Button>
        </form>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#1b5e20] text-xs font-semibold uppercase text-white"><tr>
            <th className="px-4 py-3">Nhà trường</th>
            <th className="px-4 py-3 text-right">Hoa hồng</th>
            <th className="px-4 py-3 text-right">Đã nhận</th>
            <th className="px-4 py-3 text-center">Thao tác</th>
          </tr></thead>
          <tbody className="divide-y divide-border/70">
            {rows.map(row=><tr key={row.contract_id}>
              <td className="px-4 py-3"><p className="font-medium">{row.school_name}</p>
                <p className="text-xs text-muted-foreground">{row.contract_code}</p></td>
              <td className="px-4 py-3 text-right tabular-nums">{channelMoney(row.commission)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{channelMoney(row.paid)}</td>
              <td className="px-4 py-3 text-center"><Button variant="outline" size="icon"
                aria-label={`Xem hoa hồng ${row.school_name}`} title="Xem chi tiết"
                onClick={()=>setSelected(row)}><Eye className="size-4"/></Button></td>
            </tr>)}
            {!loading&&rows.length===0&&<tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Chưa có hoa hồng phù hợp.</td></tr>}
            {loading&&<tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Đang tải thu nhập…</td></tr>}
          </tbody>
        </table></div>
        <AppPagination page={page} pageSize={pageSize} total={data?.total??0}
          onPageChange={setPage} onPageSizeChange={v=>{setPageSize(v);setPage(1);}}
          pageSizeOptions={[10,20,50,100]} disabled={loading}/>
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 font-semibold">Lịch sử phiếu chi của tôi</h3>
        <div className="space-y-2">{(data?.payouts??[]).map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-2 text-sm">
          <div><p className="font-medium">{p.code}</p><p className="text-xs text-muted-foreground">Kỳ {p.period} · {p.paid_at?channelDate(p.paid_at):'Chưa chuyển'}</p></div>
          <div className="text-right"><p className="font-semibold tabular-nums">{channelMoney(p.amount)}</p><p className="text-xs text-muted-foreground">{statusLabel[p.status]??p.status}{p.payment_reference?` · ${p.payment_reference}`:''}</p></div>
        </div>)}
        {data?.payouts.length===0&&<p className="text-sm text-muted-foreground">Chưa có phiếu chi trong phạm vi đã chọn.</p>}</div>
      </section>
    </>}
    <AppDrawer open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}
      title="CHI TIẾT HOA HỒNG" description={selected?.school_name??''} wide>
      {selected&&<div className="space-y-5 text-sm">
        <div className="rounded-xl border p-4"><p className="font-semibold">{selected.school_name}</p>
          <p className="mt-1 text-muted-foreground">{selected.contract_code}</p></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Hoa hồng phát sinh</p><p className="mt-2 font-semibold">{channelMoney(selected.commission)}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Đã nhận (phân bổ)</p><p className="mt-2 font-semibold">{channelMoney(selected.paid)}</p></div>
        </div>
        <p>Chưa nhận: <strong>{channelMoney(selected.unpaid)}</strong></p>
        {detailError&&<p role="alert" className="text-red-700">{detailError}</p>}
        {!detail&&!detailError&&<p className="text-muted-foreground">Đang tải chi tiết…</p>}
        {detail&&<>
          <section className="space-y-2 border-t pt-4">
            <h3 className="text-base font-semibold">1. Thông tin hợp đồng</h3>
            <p>Giá trị hợp đồng: {channelMoney(detail.contract.contract_value)}</p>
            <p>Trạng thái hợp đồng: {detail.contract.contract_status}</p>
            <p>Đối soát CHECKEE: {detail.reconciliation_status==='CONFIRMED'?'Đã xác nhận':(detail.reconciliation_status??'Chưa đối soát')}</p>
          </section>
          <section className="space-y-2 border-t pt-4">
            <h3 className="text-base font-semibold">2. Cơ sở và chính sách hoa hồng</h3>
            {detail.ledger.map(entry=><div key={entry.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{channelMoney(entry.amount)}</strong>
                <span className="text-muted-foreground">Kỳ {entry.period} · {channelDate(entry.occurred_at)}</span>
              </div>
              <p className="mt-2 text-muted-foreground">Cơ sở: {channelMoney(entry.calculation_base)} · Tỷ lệ {entry.rate_percent}% · {entry.policy_code}</p>
              {entry.reason&&<p className="mt-1">Điều chỉnh: {entry.reason}</p>}
            </div>)}
          </section>
          <section className="space-y-2 border-t pt-4">
            <h3 className="text-base font-semibold">3. Các khoản trường đã thanh toán làm cơ sở tính</h3>
            {detail.receipts.length===0?<p className="text-muted-foreground">Chưa có khoản thu liên kết với bút toán.</p>
              :detail.receipts.map(x=><div key={x.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
              <span>{channelDate(x.received_at)} · {x.reference_code||'—'}</span><strong>{channelMoney(x.amount)}</strong>
            </div>)}
          </section>
          <section className="space-y-2 border-t pt-4">
            <h3 className="text-base font-semibold">4. Lịch sử phiếu chi liên quan</h3>
            {detail.payments.length===0?<p className="text-muted-foreground">Chưa có phiếu chi cho các bút toán này.</p>
              :detail.payments.map(x=><div key={x.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap justify-between gap-2"><strong>{x.code}</strong><span>{statusLabel[x.status]??x.status}</span></div>
                <p className="mt-2">Phần tiền phân bổ: {channelMoney(x.allocated_amount)}</p>
                <p className="mt-1 text-muted-foreground">{x.paid_at?channelDate(x.paid_at):'Chưa chuyển'} · {x.payment_reference||'Chưa có mã giao dịch'}</p>
                {x.evidence_id && x.evidence_name && <Button type="button" variant="outline" size="sm"
                  className="mt-2" onClick={()=>void openProof(x.evidence_id!,x.evidence_name!)}>Xem ảnh chứng từ</Button>}
              </div>)}
          </section>
          {proofError&&<p role="alert" className="text-red-700">{proofError}</p>}
          <p className="text-xs text-muted-foreground">Với phiếu chi gộp nhiều hợp đồng, số tiền được phân bổ theo tỷ trọng bút toán; không phải giao dịch ngân hàng tách riêng cho từng trường.</p>
        </>}
      </div>}
    </AppDrawer>
  </div>;
}
