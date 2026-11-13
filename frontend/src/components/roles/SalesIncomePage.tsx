'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Eye, FileImage, ExternalLink } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { SalesListLayout, SalesListRow, SalesListToolbar } from '@/components/common/sales-list';
import { AppButton } from '@/components/common/buttons/app-button';
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
  DRAFT:'Nháp', PENDING_APPROVAL:'Chờ duyệt', CHANGES_REQUESTED:'Cần bổ sung',
  APPROVED:'Chờ chuyển', PAID:'Đã chuyển'
};

export function SalesIncomePage({apiBase,token,abilities}:{
  apiBase:string;token:string;abilities:string[];
}) {
  // The income screen now shows all periods, with no period filter.
  const period = 'ALL';
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
      <SalesListLayout
        columns={['Trường học','Hoa hồng','Đã nhận','Thao tác']}
        template="minmax(240px,2fr) minmax(150px,1fr) minmax(150px,1fr) minmax(100px,auto)"
        minWidth={720} page={page} pageSize={pageSize} total={data?.total ?? 0}
        loading={loading} onPageChange={setPage}
        onPageSizeChange={size => {setPageSize(size);setPage(1);}}
        empty="Chưa có hoa hồng phù hợp."
        toolbar={<SalesListToolbar
          search={search} onSearchChange={setSearch} searchLabel="Tìm tên trường hoặc hợp đồng"
          placeholder="Tên trường, mã hợp đồng..." onSearch={() => {setTerm(search.trim());setPage(1);}}
          onReset={() => {setTerm('');setSearch('');setPage(1);}}/>}>
        {rows.map(row => <SalesListRow key={row.contract_id}
          template="minmax(240px,2fr) minmax(150px,1fr) minmax(150px,1fr) minmax(100px,auto)">
          <div className="min-w-0">
            <p className="font-semibold">{row.school_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.contract_code}</p>
          </div>
          <div className="tabular-nums">{channelMoney(row.commission)}</div>
          <div className="tabular-nums">{channelMoney(row.paid)}</div>
          <div className="flex justify-end">
            <AdminIconAction icon={Eye} label={`Xem hoa hồng ${row.school_name}`}
              onClick={() => setSelected(row)}/>
          </div>
        </SalesListRow>)}
      </SalesListLayout>
    </>}
    <AppDrawer open={!!selected} onOpenChange={open=>{if(!open){setSelected(null);setProofError('');}}}
      title="Chi tiết hoa hồng" description={selected?.school_name??''} wide>
      {selected&&<div className="space-y-5 text-sm">
        <section aria-label="Tổng quan hoa hồng" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Tổng quan thu nhập</h3>
          <p className="text-xs text-muted-foreground">Hoa hồng phát sinh</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-foreground">{channelMoney(selected.commission)}</p>
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
            <div className="rounded-xl bg-green-50 p-3 dark:bg-green-950/30">
              <p className="flex items-center gap-1.5 text-xs font-medium text-green-800 dark:text-green-200">
                <CheckCircle2 className="size-4" aria-hidden="true"/>Đã nhận (phân bổ)
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-green-800 dark:text-green-200">{channelMoney(selected.paid)}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock3 className="size-4" aria-hidden="true"/>Chưa nhận
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">{channelMoney(selected.unpaid)}</p>
            </div>
          </div>
        </section>
        {detailError&&<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-destructive">{detailError}</p>}
        {!detail&&!detailError&&<p  className="rounded-xl border border-border p-4 text-muted-foreground">Đang tải chi tiết hoa hồng…</p>}
        {detail&&<>
          <section aria-labelledby="sales-income-contract" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="sales-income-contract" className="font-semibold text-foreground">Thông tin hợp đồng</h3>
              <span className={detail.reconciliation_status==='CONFIRMED'
                ?'inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
                :'inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'}>
                {detail.reconciliation_status==='CONFIRMED'&&<CheckCircle2 className="size-3.5" aria-hidden="true"/>}
                {detail.reconciliation_status==='CONFIRMED'?'Đã đối soát':'Chưa xác nhận đối soát'}
              </span>
            </div>
            <dl className="space-y-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="text-muted-foreground">Trường học</dt>
                <dd className="max-w-full break-words text-right font-medium">{detail.contract.school_name}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Mã hợp đồng</dt>
                <dd className="max-w-full break-all text-right font-medium">{detail.contract.contract_code}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Giá trị hợp đồng</dt>
                <dd className="font-semibold tabular-nums">{channelMoney(detail.contract.contract_value)}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">Trạng thái hợp đồng</dt>
                <dd className="font-medium">{detail.contract.contract_status==='VERIFIED'?'Đã xác minh':detail.contract.contract_status==='CANCELLED'?'Đã hủy':detail.contract.contract_status==='ACTIVE'?'Đang hiệu lực':detail.contract.contract_status==='PENDING'?'Đang xử lý':'Theo hồ sơ hợp đồng'}</dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="sales-income-policy" className="space-y-3">
            <h3 id="sales-income-policy" className="font-semibold text-foreground">Chi tiết cách tính hoa hồng</h3>
            {detail.ledger.length===0?<p className="rounded-xl border p-4 text-muted-foreground">Chưa có bút toán hoa hồng.</p>
              :detail.ledger.map(entry=><div key={entry.id} className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold tabular-nums">{channelMoney(entry.amount)}</span>
                  <span className="text-xs text-muted-foreground">Kỳ {entry.period} · {channelDate(entry.occurred_at)}</span>
                </div>
                <dl className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Số tiền làm căn cứ tính</dt>
                    <dd className="font-medium tabular-nums">{channelMoney(entry.calculation_base)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Tỷ lệ hoa hồng</dt>
                    <dd className="font-semibold tabular-nums">{entry.rate_percent}%</dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Chính sách áp dụng</dt>
                    <dd className="font-medium">{entry.policy_code==='SYSTEM_DEFAULT'?'Chính sách mặc định':'Chính sách theo hồ sơ'}</dd>
                  </div>
                </dl>
                {entry.reason&&<p className="rounded-lg bg-muted/50 p-2 text-muted-foreground">Điều chỉnh: {entry.reason}</p>}
              </div>)}
            <p className="text-xs leading-5 text-muted-foreground">Hoa hồng được ghi nhận theo số tiền thực thu đủ điều kiện và chính sách của từng bút toán, không tự động tính trên toàn bộ giá trị hợp đồng.</p>
          </section>
          <section aria-labelledby="sales-income-receipts" className="space-y-3">
            <h3 id="sales-income-receipts" className="font-semibold text-foreground">Các khoản trường đã thanh toán</h3>
            {detail.receipts.length===0?<p className="rounded-xl border border-border p-4 text-muted-foreground">Chưa có khoản thu liên kết với bút toán.</p>
              :<div className="divide-y divide-border rounded-xl border border-border px-4">
                {detail.receipts.map(receipt=><div key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="text-muted-foreground">{channelDate(receipt.received_at)} · {receipt.reference_code||'—'}</span>
                  <span className="font-semibold tabular-nums">{channelMoney(receipt.amount)}</span>
                </div>)}
              </div>}
          </section>
          <section aria-labelledby="sales-income-payments" className="space-y-3">
            <h3 id="sales-income-payments" className="font-semibold text-foreground">Lịch sử nhận hoa hồng</h3>
            {detail.payments.length===0?<p className="rounded-xl border border-border p-4 text-muted-foreground">Chưa có phiếu chi cho các bút toán này.</p>
              :detail.payments.map(payment=><div key={payment.id} className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="min-w-0 break-all">{payment.code}</strong>
                  <span className={payment.status==='PAID'
                    ?'rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
                    :'rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground'}>
                    {statusLabel[payment.status]??'Đang xử lý'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{payment.status==='PAID'?'Đã nhận (phần phân bổ)':'Phần hoa hồng trên phiếu chi'}</p>
                <p className="text-lg font-bold tabular-nums">{channelMoney(payment.allocated_amount)}</p>
                <p className="text-xs text-muted-foreground">{payment.paid_at?channelDate(payment.paid_at):'Chưa chuyển'} · {payment.payment_reference||'Chưa có mã giao dịch'}</p>
                {payment.evidence_id && payment.evidence_name&&<AppButton type="button" tone="outline" className="h-9"
                  leadingIcon={<FileImage className="size-4" aria-hidden="true"/>}
                  trailingIcon={<ExternalLink className="size-3.5" aria-hidden="true"/>}
                  onClick={()=>void openProof(payment.evidence_id!,payment.evidence_name!)}>
                  Xem chứng từ
                </AppButton>}
              </div>)}
          </section>
          {proofError&&<p role="alert" className="rounded-xl border border-destructive/30 p-3 text-destructive">{proofError}</p>}
          <p className="text-xs leading-5 text-muted-foreground">Với phiếu chi gộp nhiều hợp đồng, số tiền hiển thị là phần phân bổ theo tỷ trọng bút toán, không phải một giao dịch ngân hàng riêng cho từng trường.</p>
        </>}
      </div>}
    </AppDrawer>
  </div>;
}
