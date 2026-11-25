'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Eye, FileImage, ExternalLink, Wallet, ReceiptText, Calculator, History } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AppPagination } from '@/components/common/app-pagination';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { SalesListLayout, SalesListRow, SalesListToolbar } from '@/components/common/sales-list';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

type Row = { contract_id:number; contract_code:string; school_name:string;
  commission:number; settled_gross:number; adjustment:number; withholding:number; paid:number; unpaid:number; entries:number;
  rate_percent:number|null; rate_is_mixed:boolean };
type Payout = {id:number;code:string;period:string;amount:number;status:string;paid_at:string|null;payment_reference:string|null};
type Income = {period:string;page:number;page_size:number;total:number;
  summary:{accrued:number;settled_gross:number;adjustment:number;withholding:number;paid:number;unpaid:number;contracts:number};
  data:Row[];payouts:Payout[]};
type IncomeDetail = {
  contract:{contract_code:string;school_name:string;contract_value:number;contract_status:string};
  reconciliation_status:string|null;
  ledger:{id:number;entry_type:string;amount:number;calculation_base:number;
    rate_percent:number;policy_code:string;period:string;occurred_at:string;reason:string|null}[];
  receipts:{id:number;amount:number;received_at:string;reference_code:string}[];
  payments:{id:number;code:string;period:string;status:string;paid_at:string|null;
    payment_reference:string|null;allocated_gross:number;allocated_adjustment:number;adjustment_reason:string|null;allocated_withholding:number;
    allocated_amount:number;withholding_reason:string|null;evidence_id:number|null;evidence_name:string|null}[];
};
const statusLabel: Record<string,string> = {
  DRAFT:'Nháp', PENDING_APPROVAL:'Chờ duyệt', CHANGES_REQUESTED:'Cần bổ sung',
  APPROVED:'Chờ chuyển', PAID:'Đã chuyển'
};

export function SalesIncomePage({apiBase,token,abilities,beneficiaryRole='SALES'}:{
  apiBase:string;token:string;abilities:string[];beneficiaryRole?:'SALES'|'MANAGER';
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
      const qs=new URLSearchParams({period,page:String(page),pageSize:String(pageSize),beneficiaryRole});
      if(term)qs.set('search',term);
      setData(await channelRequest<Income>(apiBase,token,`/income/me?${qs.toString()}`));
    }catch(e){setError(e instanceof Error?e.message:'Không tải được thu nhập.');setData(null);}
    finally{setLoading(false);}
  },[apiBase,token,permitted,page,pageSize,period,term,beneficiaryRole]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    if(!selected||!permitted||!apiBase||!token){setDetail(null);return;}
    let active=true;setDetail(null);setDetailError('');
    const q=new URLSearchParams({period,beneficiaryRole});
    void channelRequest<IncomeDetail>(apiBase,token,`/income/me/contracts/${selected.contract_id}?${q}`)
      .then(value=>{if(active)setDetail(value);})
      .catch(cause=>{if(active)setDetailError(cause instanceof Error?cause.message:'Không tải được chi tiết hoa hồng.');});
    return()=>{active=false;};
  },[selected,permitted,apiBase,token,period,beneficiaryRole]);
  const rows=data?.data??[];
  return <div className="space-y-5">
    <AppPageHeader eyebrow={beneficiaryRole==='MANAGER'?"QUẢN LÝ BÁN HÀNG / KIDSFIT CRM":"BÁN HÀNG / KIDSFIT CRM"} title="Thu nhập"
      description="Theo dõi hoa hồng phát sinh, khoản khấu trừ và số tiền thực nhận."/>
    {!permitted && <p role="alert" className="rounded-lg border p-4 text-sm">Tài khoản chưa có quyền xem hoa hồng.</p>}
    {permitted && <>
      {error && <p role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AppStatCard icon={Wallet} label="Tổng hoa hồng" value={data ? channelMoney(data.summary.accrued) : '—'}
          description="Tổng hoa hồng đã ghi nhận"/>
        <AppStatCard icon={ReceiptText} label="Khấu trừ" value={data ? channelMoney(data.summary.withholding) : '—'}
          description="Khoản khấu trừ trên phiếu đã chi"/>
        <AppStatCard icon={CheckCircle2} label="Thực nhận" value={data ? channelMoney(data.summary.paid) : '—'}
          description="Số tiền thực chi sau khấu trừ"/>
        <AppStatCard icon={Clock3} label="Chưa thanh toán" value={data ? channelMoney(data.summary.unpaid) : '—'}
          description="Hoa hồng chưa quyết toán"/>
      </div>
      <p className="text-xs text-muted-foreground">Có {data?.summary.contracts ?? 0} hợp đồng phát sinh hoa hồng. Khấu trừ chỉ tính trên phiếu đã chi.</p>
      <section aria-label="Danh sách hoa hồng trên thiết bị nhỏ" className="space-y-3 overflow-hidden rounded-2xl border border-border bg-card md:hidden">
        <SalesListToolbar search={search} onSearchChange={setSearch}
          searchLabel="Tìm tên trường hoặc hợp đồng" placeholder="Tên trường, mã hợp đồng..."
          onSearch={() => {setTerm(search.trim());setPage(1);}}
          onReset={() => {setTerm('');setSearch('');setPage(1);}}/>
        <div className="space-y-3 px-3 pb-2">
          {loading && <output className="block p-4 text-sm text-muted-foreground">Đang tải dữ liệu…</output>}
          {!loading && rows.length===0 && <p className="p-4 text-sm text-muted-foreground">Chưa có hoa hồng phù hợp.</p>}
          {!loading && rows.map(row => <article key={row.contract_id} className="space-y-3 rounded-xl border border-border p-3">
            <div className="min-w-0 space-y-1">
              <p className="break-words font-semibold">{row.school_name}</p>
              <p className="break-all text-xs text-muted-foreground">{row.contract_code}</p>
              <p className="text-xs font-medium text-primary">{row.rate_is_mixed?'Nhiều mức hoa hồng':row.rate_percent==null?'Chưa có tỷ lệ':row.rate_percent+'% hoa hồng'}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
              <div><dt className="text-muted-foreground">Hoa hồng</dt><dd className="mt-1 font-semibold tabular-nums">{channelMoney(row.commission)}</dd></div>
              <div><dt className="text-muted-foreground">Khấu trừ</dt><dd className="mt-1 font-semibold tabular-nums text-amber-700 dark:text-amber-300">{channelMoney(row.withholding)}</dd></div>
              <div><dt className="text-muted-foreground">Thực nhận</dt><dd className="mt-1 font-semibold tabular-nums text-green-700 dark:text-green-300">{channelMoney(row.paid)}</dd></div>
              <div><dt className="text-muted-foreground">Chưa thanh toán</dt><dd className="mt-1 font-semibold tabular-nums">{channelMoney(row.unpaid)}</dd></div>
            </dl>
            <AppButton type="button" tone="outline" className="w-full justify-center"
              leadingIcon={<Eye className="size-4" aria-hidden="true"/>}
              onClick={() => setSelected(row)}>Xem chi tiết</AppButton>
          </article>)}
        </div>
        <AppPagination page={page} pageSize={pageSize} total={data?.total??0}
          disabled={loading} showSummary={false} pageSizeOptions={[10,20,50,100]}
          onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
      </section>
      <div className="hidden md:block">
      <SalesListLayout
        columns={['Trường học','Tỷ lệ HH','Hoa hồng','Khấu trừ','Thực nhận','Chưa thanh toán','Thao tác']}
        template="minmax(220px,1.8fr) minmax(85px,.55fr) repeat(4,minmax(115px,1fr)) minmax(75px,auto)"
        minWidth={1150} page={page} pageSize={pageSize} total={data?.total ?? 0}
        loading={loading} onPageChange={setPage}
        onPageSizeChange={size => {setPageSize(size);setPage(1);}}
        empty="Chưa có hoa hồng phù hợp."
        toolbar={<SalesListToolbar
          search={search} onSearchChange={setSearch} searchLabel="Tìm tên trường hoặc hợp đồng"
          placeholder="Tên trường, mã hợp đồng..." onSearch={() => {setTerm(search.trim());setPage(1);}}
          onReset={() => {setTerm('');setSearch('');setPage(1);}}/>}>
        {rows.map(row => <SalesListRow key={row.contract_id}
          template="minmax(220px,1.8fr) minmax(85px,.55fr) repeat(4,minmax(115px,1fr)) minmax(75px,auto)">
          <div className="min-w-0">
            <p className="font-semibold">{row.school_name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.contract_code}</p>
          </div>
          <div className="tabular-nums">
            {row.rate_is_mixed
              ? <span title="Tỷ lệ khác nhau theo từng bút toán">Nhiều mức</span>
              : row.rate_percent==null?'—':<span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">{row.rate_percent}%</span>}
          </div>
          <div className="tabular-nums">{channelMoney(row.commission)}</div>
          <div className="tabular-nums text-amber-700 dark:text-amber-300">{channelMoney(row.withholding)}</div>
          <div className="tabular-nums font-semibold text-green-700 dark:text-green-300">{channelMoney(row.paid)}</div>
          <div className="tabular-nums">{channelMoney(row.unpaid)}</div>
          <div className="flex justify-end">
            <AdminIconAction icon={Eye} label={`Xem hoa hồng ${row.school_name}`}
              onClick={() => setSelected(row)}/>
          </div>
        </SalesListRow>)}
      </SalesListLayout>
      </div>
    </>}
    <AppDrawer open={!!selected} onOpenChange={open=>{if(!open){setSelected(null);setProofError('');}}}
      title="Chi tiết hoa hồng" description={selected?.school_name??''} compactHeader bodyClassName="space-y-4 bg-muted/10">
      {selected&&<div className="space-y-5 text-sm">
        <section aria-label="Tổng quan hoa hồng" className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Hoa hồng phát sinh</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{channelMoney(selected.commission)}</p>
            </div>
            <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">
              {selected.unpaid<0?'Cần đối soát':selected.unpaid===0 ? 'Đã quyết toán' : 'Còn chờ quyết toán'}
            </span>
          </div>
          <dl className="divide-y divide-border border-t border-border">
            <div className="flex items-center justify-between gap-2 py-2">
              <dt className="text-muted-foreground">Hoa hồng đã quyết toán</dt>
              <dd className="font-semibold tabular-nums">{channelMoney(selected.settled_gross)}</dd>
            </div>
            {selected.adjustment!==0 && <div className="flex items-center justify-between gap-2 py-2">
              <dt className="text-muted-foreground">Điều chỉnh khi lập phiếu chi</dt>
              <dd className="font-semibold tabular-nums">{channelMoney(selected.adjustment)}</dd>
            </div>}
            <div className="flex items-center justify-between gap-2 py-2">
              <dt className="text-muted-foreground">Khấu trừ</dt>
              <dd className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">−{channelMoney(selected.withholding)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 py-2">
              <dt className="font-semibold">Thực nhận</dt>
              <dd className="text-xl font-bold tabular-nums text-green-700 dark:text-green-300">{channelMoney(selected.paid)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <dt className="text-muted-foreground">Chưa thanh toán</dt>
              <dd className="font-semibold tabular-nums">{channelMoney(selected.unpaid)}</dd>
            </div>
          </dl>
          {selected.unpaid<0 && <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">Số quyết toán lớn hơn hoa hồng ghi nhận. Vui lòng đối chiếu với Kế toán.</p>}
        </section>
        {detailError&&<p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-destructive">{detailError}</p>}
        {!detail&&!detailError&&<p  className="rounded-xl border border-border p-4 text-muted-foreground">Đang tải chi tiết hoa hồng…</p>}
        {detail&&<>
          <section aria-labelledby="sales-income-contract" className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="sales-income-contract" className="font-semibold text-foreground">Thông tin hợp đồng</h3>
              <span className={detail.reconciliation_status==='CONFIRMED'
                ?'inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
                :'inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground'}>
                {detail.reconciliation_status==='CONFIRMED'&&<CheckCircle2 className="size-3.5" aria-hidden="true"/>}
                {detail.reconciliation_status==='CONFIRMED'?'Đã đối soát':'Chưa xác nhận đối soát'}
              </span>
            </div>
            <dl className="space-y-3">
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
          <details className="group rounded-2xl border border-border bg-card p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Calculator className="size-4 text-primary" aria-hidden="true"/>Chi tiết cách tính hoa hồng</summary>
            <div className="mt-3 space-y-3">
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
            </div>
          </details>
          <section aria-labelledby="sales-income-payments" className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h3 id="sales-income-payments" className="flex items-center gap-2 font-semibold text-foreground"><History aria-hidden="true" className="size-4 text-primary"/>Lịch sử chi trả và khấu trừ</h3>
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
                <dl className="space-y-1 border-t border-border pt-2 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Giá trị quyết toán (gross)</dt><dd className="tabular-nums">{channelMoney(payment.allocated_gross)}</dd></div>
                  {payment.allocated_adjustment!==0&&<div className="flex justify-between gap-2"><dt className="text-muted-foreground">Điều chỉnh giá trị chi</dt><dd className="tabular-nums">{channelMoney(payment.allocated_adjustment)}</dd></div>}
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Khấu trừ</dt><dd className="tabular-nums text-amber-700 dark:text-amber-300">−{channelMoney(payment.allocated_withholding)}</dd></div>
                  <div className="flex justify-between gap-2 font-semibold"><dt>{payment.status==='PAID'?'Đã thực nhận':'Dự kiến thực nhận'}</dt><dd className="tabular-nums">{channelMoney(payment.allocated_amount)}</dd></div>
                </dl>
                {payment.allocated_adjustment!==0&&payment.adjustment_reason&&<p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">Lý do điều chỉnh: {payment.adjustment_reason}</p>}
                {payment.allocated_withholding>0&&<p className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">Lý do khấu trừ: {payment.withholding_reason||'Chưa cập nhật'}</p>}
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
        </>}
      </div>}
    </AppDrawer>
  </div>;
}
