'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { AlertCircle, ExternalLink, Eye, FileText, Image as ImageIcon, MapPin, Plus, RotateCcw, Search, UserRound } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppPagination } from '@/components/common/app-pagination';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppButton } from '@/components/common/buttons/app-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

type ContractRow = {
  id: number;
  contract_code: string;
  school_name: string;
  owner_name: string;
  owner_user_id: number;
  verified_at: string | null;
  personnel_type: string | null;
  total_value: number;
  received: number;
  refunded: number;
  commission: number;
  contract_status: string;
};
type ContractList = { data: ContractRow[]; owners?: { id: number; name: string }[] | null; total: number; page: number; page_size: number };
type Detail = {
  data: { id: number; contract_code: string; school_name: string; school_address: string | null; school_district: string | null; school_province: string | null; owner_name: string; personnel_type: string | null;
    signed_on: string; effective_on: string | null; status: string; verified_at: string | null; total_value: number; evidence_reference: string | null; owner_organization_id: number; owner_user_id: number; service_plan:string|null;student_count:number|null };
  schedules: { id: number; due_on: string; amount_due: number; amount_received: number; status: string }[];
  receipts: { id: number; received_at: string; amount: number; reference_code: string; payment_method: string }[];
  ledger: { id: number; entry_type: string; amount: number; rate_percent: number; reason: string | null; occurred_at: string;
    period: string; beneficiary_user_id: number; beneficiary_organization_id: number; assigned_to_payout: boolean; reconciled: boolean }[];
  payouts: { id: number; code: string; net_amount: number; status: string; paid_at: string | null; payment_reference: string | null }[];
  evidence: {id:number;kind:string;file_name:string;revenue_receipt_id:number|null;payout_id:number|null}[];
  school_units: {id:number;name:string}[];
};

export function AccountingContractsPage({ apiBase, token, abilities }: {
  apiBase: string; token: string; abilities: string[]; onChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('ALL');
  const [financialView, setFinancialView] = useState<'CURRENT' | 'HISTORY'>('CURRENT');
  const [owners, setOwners] = useState<{ id: number; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const [payoutPeriod, setPayoutPeriod] = useState('');
  const [entryMode, setEntryMode] = useState<'receipt' | 'payout' | null>(null);
  const [preview, setPreview] = useState<{url:string; name:string; mime:string}|null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canView = abilities.includes('channel_sales.commission.view') || abilities.includes('*');
  const connected = Boolean(apiBase && token && canView);
  const load = useCallback(async () => {
    if (!connected) return;
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), financial_view: financialView });
      if (ownerUserId !== 'ALL') params.set('owner_user_id', ownerUserId);
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
      const result = await channelRequest<ContractList>(apiBase, token, `/accounting/contracts?${params.toString()}`);
      setRows(result.data);
      // During staged deployments the previous API may not include owner options yet.
      setOwners(Array.isArray(result.owners) ? result.owners : []);
      setTotal(result.total);
    } catch (cause) {
      setRows([]);
      setOwners([]);
      setTotal(0);
      setError(cause instanceof Error ? cause.message : 'Không tải được hợp đồng.');
    } finally {
      setBusy(false);
    }
  }, [apiBase, token, page, pageSize, appliedSearch, ownerUserId, financialView, connected]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!connected || selected === null) { setDetail(null); return; }
    let live = true;
    setDetail(null);
    void channelRequest<Detail>(apiBase, token, `/accounting/contracts/${selected}`)
      .then(value => { if (live) setDetail(value); })
      .catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'Không tải được chi tiết.'); });
    return () => { live = false; };
  }, [apiBase, token, selected, connected, detailRevision]);

  const viewEvidence = async (id: number, name: string, inNewTab = false) => {
    setActionError('');
    // Open synchronously on click to avoid popup blockers, then load authenticated bytes.
    const tab = inNewTab ? window.open('', '_blank') : null;
    if (inNewTab && tab) tab.document.title = 'Đang mở hợp đồng...';
    try {
      const response = await fetch(`${apiBase}/channel-sales/evidence/${id}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (!response.ok) throw new Error('Không có quyền xem chứng từ hoặc tệp không còn tồn tại.');
      const original = await response.blob();
      const ext = name.toLowerCase().split('.').pop();
      const mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const url = URL.createObjectURL(new Blob([original], {type: mime}));
      if (inNewTab) {
        if (!tab) { URL.revokeObjectURL(url); throw new Error('Trình duyệt đang chặn tab mới. Vui lòng cho phép mở cửa sổ.'); }
        tab.location.replace(url);
        // Blob URLs live for the tab session; revoke on the main window's unload.
        window.addEventListener('pagehide', () => URL.revokeObjectURL(url), {once:true});
      } else {
        setPreview(old => { if (old) URL.revokeObjectURL(old.url); return {url, name, mime}; });
      }
    } catch (cause) {
      if (tab) tab.close();
      setActionError(cause instanceof Error ? cause.message : 'Không mở được chứng từ.');
    }
  };
  const closePreview = () => {
    setPreview(old => { if (old) URL.revokeObjectURL(old.url); return null; });
  };
  const submitSearch = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  const canRecordRevenue = abilities.includes('channel_sales.revenue.record') || abilities.includes('*');
  const canCompletePayout = abilities.includes('channel_sales.payout.complete') || abilities.includes('*');
  const canCreatePayout = abilities.includes('channel_sales.payout.create') || abilities.includes('*');
  const canApprovePayout = abilities.includes('channel_sales.payout.approve') || abilities.includes('*');
  const sendRecord = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selected === null || !detail || !entryMode) return;
    const form = new FormData(event.currentTarget);
    const proof = form.get('proof');
    if (!(proof instanceof File) || proof.size === 0) {
      setActionError('Vui lòng chọn ảnh chứng từ chuyển khoản.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const attachment = new FormData();
      attachment.set('kind', entryMode === 'receipt' ? 'RECEIPT' : 'PAYOUT');
      attachment.set('file', proof);
      const payoutId = Number(form.get('payout_id'));
      if (entryMode === 'receipt') attachment.set('contract_id', String(selected));
      else attachment.set('payout_id', String(payoutId));
      const uploaded = await channelRequest<{data:{id:number}}>(apiBase, token, '/evidence', { method: 'POST', body: attachment });
      const dateValue = form.get('transaction_date');
      const date = typeof dateValue === 'string' ? dateValue : '';
      const referenceValue = form.get('reference_code');
      const reference = typeof referenceValue === 'string' ? referenceValue : '';
      const timestamp = new Date(date + 'T12:00:00+07:00').toISOString();
      if (entryMode === 'receipt') {
        await channelRequest(apiBase, token, `/contracts/${selected}/revenue-receipts`, {
          method: 'POST', body: JSON.stringify({
            idempotency_key: crypto.randomUUID(), revenue_schedule_id: Number(form.get('schedule_id')),
            received_at: timestamp, amount: Number(form.get('amount')),
            reference_code: reference,
            payment_method: 'BANK_TRANSFER', evidence_id: uploaded.data.id,
          }),
        });
      } else {
        await channelRequest(apiBase, token, `/payouts/${payoutId}/complete`, {
          method: 'POST', body: JSON.stringify({
            paid_at: timestamp, payment_reference: reference,
            evidence_id: uploaded.data.id,
            amount: Number(form.get('amount')),
          }),
        });
      }
      setEntryMode(null);
      setDetailRevision(v => v + 1);
      await load();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thể lưu giao dịch.');
    } finally {
      setSaving(false);
    }
  };
  const eligibleByPeriod = new Map<string, number>();
  for (const entry of detail?.ledger ?? []) {
    if (entry.reconciled && !entry.assigned_to_payout && entry.beneficiary_user_id === detail?.data.owner_user_id
      && entry.beneficiary_organization_id === detail?.data.owner_organization_id) {
      eligibleByPeriod.set(entry.period, (eligibleByPeriod.get(entry.period) ?? 0) + entry.amount);
    }
  }
  const eligiblePeriods = [...eligibleByPeriod.entries()].filter(([,amount])=>amount>0).map(([period])=>period).sort().reverse();
  const chosenPeriod = eligiblePeriods.includes(payoutPeriod) ? payoutPeriod : (eligiblePeriods[0] ?? '');
  const createPayout = async () => {
    if (!detail || !chosenPeriod) return;
    setSaving(true);
    setActionError('');
    try {
      await channelRequest(apiBase, token, '/payouts', {method:'POST',body:JSON.stringify({
        idempotency_key: crypto.randomUUID(), organization_id: detail.data.owner_organization_id,
        beneficiary_user_id: detail.data.owner_user_id, period: chosenPeriod,
        contract_id: detail.data.id, withholding_amount: 0,
      })});
      setDetailRevision(v => v+1);
      await load();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không tạo được phiếu chi.'); }
    finally { setSaving(false); }
  };
  const approvePayout = async (id: number) => {
    setSaving(true);
    setActionError('');
    try {
      await channelRequest(apiBase, token, `/payouts/${id}/approve`, {method:'POST'});
      setDetailRevision(v => v+1);
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không duyệt được phiếu chi.'); }
    finally { setSaving(false); }
  };
  const resetFilters = () => {
    setSearch('');
    setAppliedSearch('');
    setOwnerUserId('ALL');
    setPage(1);
  };
  return <div className="space-y-5">
    <AppPageHeader eyebrow="KẾ TOÁN / KIDSFIT CRM" title="Hợp đồng & hoa hồng"
      description="Theo dõi hợp đồng đã được CHECKEE xác minh, doanh thu và hoa hồng theo người phụ trách." />
    {!connected && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">Cần đăng nhập bằng tài khoản có quyền xem hoa hồng để tải dữ liệu thực tế.</p>}
    {error && <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-300 p-3 text-sm text-red-700"><AlertCircle className="size-4"/>{error}</p>}
    <fieldset className="flex flex-wrap gap-2" aria-label="Nhóm hợp đồng kế toán">
      <Button type="button" variant={financialView === 'CURRENT' ? 'default' : 'outline'}
        aria-pressed={financialView === 'CURRENT'} onClick={() => { setFinancialView('CURRENT'); setOwnerUserId('ALL'); setPage(1); }}>
        Hợp đồng đã xác minh
      </Button>
      <Button type="button" variant={financialView === 'HISTORY' ? 'default' : 'outline'}
        aria-pressed={financialView === 'HISTORY'} onClick={() => { setFinancialView('HISTORY'); setOwnerUserId('ALL'); setPage(1); }}>
        Lịch sử tài chính
      </Button>
    </fieldset>
    <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="relative min-w-[190px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <Input aria-label="Tìm hợp đồng và hoa hồng" className="h-11 w-full rounded-xl pl-10"
            placeholder="Tên trường, mã hợp đồng, người phụ trách..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <AppNativeSelect aria-label="Lọc theo người phụ trách" value={ownerUserId} containerClassName="w-full sm:w-60"
          onChange={e=>{setOwnerUserId(e.target.value);setPage(1);}}>
          <option value="ALL">Tất cả người phụ trách</option>
          {owners.map(owner => <option key={owner.id} value={String(owner.id)}>{owner.name}</option>)}
        </AppNativeSelect>
        <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
        <AppButton type="button" tone="outline" size="icon-lg" className="h-11 w-11 min-w-11 rounded-lg p-0"
          aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={resetFilters}>
          <RotateCcw className="size-4" aria-hidden="true"/>
        </AppButton>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[930px] text-left text-sm">
          <thead className="bg-[#1b5e20] text-xs font-bold uppercase tracking-[.06em] text-white">
            <tr>
              <th className="px-5 py-4">Nhà trường</th>
              <th className="px-4 py-4">Phụ trách</th>
              <th className="px-4 py-4 text-right">Giá trị hợp đồng</th>
              <th className="px-4 py-4 text-right">Thực thu</th>
              <th className="px-4 py-4 text-right">Hoa hồng</th>
              <th className="px-5 py-4 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {rows.map(row=><tr key={row.id} className="transition-colors even:bg-muted/20 hover:bg-muted/40">
              <td className="px-5 py-4 align-middle">
                <p className="font-semibold text-foreground">{row.school_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.contract_code}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.contract_status === 'PENDING_KIDSFIT' ? 'CHECKEE đã xác minh · Chờ KIDSFIT' : row.contract_status === 'CANCELLED' ? 'Đã hủy · Giữ lịch sử' : row.contract_status === 'REJECTED' ? 'Từ chối sau xác minh' : 'Đã xác minh'}</p>
              </td>
              <td className="px-4 py-4 align-middle">
                <p>{row.owner_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.personnel_type==='COLLABORATOR'?'CTV':'Nhân viên'}</p>
              </td>
              <td className="px-4 py-4 text-right align-middle tabular-nums">{channelMoney(row.total_value)}</td>
              <td className="px-4 py-4 text-right align-middle tabular-nums">{channelMoney(row.received-row.refunded)}</td>
              <td className="px-4 py-4 text-right align-middle font-semibold tabular-nums">{channelMoney(row.commission)}</td>
              <td className="px-5 py-4 text-center align-middle">
                <Button type="button" variant="outline" size="icon" onClick={()=>setSelected(row.id)}
                  aria-label={`Xem chi tiết ${row.contract_code}`} title={`Xem hợp đồng ${row.contract_code}`}>
                  <Eye className="size-4"/>
                </Button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!busy && rows.length===0 && <p className="p-10 text-center text-sm text-muted-foreground">Không có hợp đồng phù hợp. Hãy thử bộ lọc khác.</p>}
      <AppPagination page={page} pageSize={pageSize} total={total} itemLabel="hợp đồng"
        disabled={busy} showSummary={false} pageSizeOptions={[20,50,100]}
        onPageChange={setPage}
        onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
    </section>
    <AppDrawer wide compactAccountingHeader open={selected !== null} onOpenChange={open => { if (!open) {setSelected(null);setEntryMode(null);closePreview();} }}
      title="KIDSFIT CRM - CHI TIẾT HỢP ĐỒNG" description="Chi tiết hợp đồng kế toán">
      {!detail ? <p className="text-sm text-muted-foreground">Đang tải chi tiết...</p> : <div className="space-y-6 text-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chi tiết hợp đồng · {detail.data.contract_code}</p>
          <h2 className="text-xl font-bold">{detail.data.school_name}</h2>
          <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>
            <span>{[detail.data.school_address, detail.data.school_district, detail.data.school_province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}</span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground"><UserRound className="size-4" aria-hidden="true"/>
            Phụ trách: {detail.data.owner_name} · {detail.data.personnel_type === 'COLLABORATOR' ? 'CTV' : 'Nhân viên'}
          </p>
          <span className="inline-flex rounded-full border px-2 py-1 text-xs font-medium">{detail.data.status === 'ACTIVE' ? 'Hợp đồng hợp lệ' : detail.data.status === 'PENDING_KIDSFIT' ? 'CHECKEE đã xác minh · Chờ KIDSFIT' : detail.data.status === 'CANCELLED' ? 'Đã hủy · Lịch sử' : detail.data.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Giá trị hợp đồng" value={channelMoney(detail.data.total_value)}/>
          <Metric label="Nhà trường đã trả" value={channelMoney(detail.receipts.reduce((sum,x)=>sum+x.amount,0))}/>
          <Metric label="Hoa hồng" value={channelMoney(detail.ledger.reduce((sum,x)=>sum+x.amount,0))}/>
          <Metric label="Hoa hồng đã chuyển" value={channelMoney(detail.payouts.filter(x=>x.status==='PAID').reduce((sum,x)=>sum+x.net_amount,0))}/>
        </div>
        <section className="space-y-3 border-t pt-5">
          <h3 className="text-lg font-bold text-foreground">1. Thông tin hợp đồng</h3>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Mã hợp đồng</dt><dd className="mt-1 font-medium">{detail.data.contract_code}</dd></div>
            <div><dt className="text-muted-foreground">Ngày ký</dt><dd className="mt-1 font-medium">{channelDate(detail.data.signed_on)}</dd></div>
            <div><dt className="text-muted-foreground">CHECKEE xác minh</dt><dd className="mt-1 font-medium">{detail.data.verified_at ? channelDate(detail.data.verified_at) : 'Chưa xác minh'}</dd></div>
            <div><dt className="text-muted-foreground">Gói dịch vụ</dt><dd className="mt-1 font-medium">{detail.data.service_plan==='SCHOOL_YEAR'?'Năm học':detail.data.service_plan==='MONTHLY_9'?'Thanh toán theo tháng':'Chưa khai báo'}</dd></div>
            <div><dt className="text-muted-foreground">Số học sinh</dt><dd className="mt-1 font-medium">{detail.data.student_count ?? 'Chưa khai báo'}</dd></div>
          </dl>
          <div><p className="text-muted-foreground">Trường điểm triển khai</p><p className="mt-1">{detail.school_units.length ? detail.school_units.map(x=>x.name).join(', ') : 'Chỉ trường chính / chưa khai báo'}</p></div>
          {detail.evidence.filter(x=>x.kind==='CONTRACT').map(x=><button key={x.id} type="button"
            className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/40"
            onClick={()=>void viewEvidence(x.id,x.file_name,true)} title="Mở hợp đồng trong tab mới">
              <span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0"/><span className="truncate">{x.file_name}</span></span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true"/>
            </button>)}
          {detail.evidence.every(x=>x.kind!=='CONTRACT') && <p className="text-muted-foreground">Chưa có file hợp đồng đính kèm. {detail.data.evidence_reference ?? ''}</p>}
          <h4 className="pt-2 font-semibold">Lịch thanh toán theo hợp đồng</h4>
          {detail.schedules.length===0 && <p className="text-muted-foreground">Chưa có lịch thanh toán.</p>}
          {detail.schedules.map(x=><div key={x.id} className="flex items-center justify-between gap-3 border-b py-2">
            <div><div>Hạn {channelDate(x.due_on)}</div><div className="text-xs text-muted-foreground">{x.status}</div></div>
            <div className="text-right tabular-nums">{channelMoney(x.amount_due)}<div className="text-xs text-muted-foreground">Đã trả {channelMoney(x.amount_received)}</div></div>
          </div>)}
        </section>
        <section className="space-y-3 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-foreground">2. Nhà trường thanh toán</h3>
            {canRecordRevenue && detail.data.status==='ACTIVE' && <Button size="sm" disabled={saving || !detail.schedules.some(x=>x.amount_received<x.amount_due)}
              onClick={()=>{setActionError('');setEntryMode('receipt');}}><Plus className="size-4"/> Thêm khoản thu</Button>}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Ngày nhận</th>
                  <th className="px-3 py-3">Mã giao dịch</th>
                  <th className="px-3 py-3 text-right">Số tiền</th>
                  <th className="w-16 px-3 py-3 text-center">Ảnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {detail.receipts.length===0 ? <tr><td colSpan={4} className="px-3 py-7 text-center text-muted-foreground">Chưa có khoản thu nào.</td></tr>
                  : detail.receipts.map(x=>{
                    const proof = detail.evidence.find(e=>e.revenue_receipt_id===x.id);
                    return <tr key={x.id} className="hover:bg-muted/20">
                      <td className="whitespace-nowrap px-3 py-3">{channelDate(x.received_at)}</td>
                      <td className="max-w-[160px] break-words px-3 py-3">{x.reference_code || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">{channelMoney(x.amount)}</td>
                      <td className="px-3 py-2 text-center">
                        {proof ? <Button type="button" variant="outline" size="icon" title="Xem ảnh nhà trường chuyển khoản"
                          aria-label={`Xem chứng từ khoản thu ${x.reference_code}`}
                          onClick={()=>void viewEvidence(proof.id,proof.file_name)}><ImageIcon className="size-4"/></Button>
                          : <span className="text-muted-foreground" aria-label="Không có ảnh chứng từ">—</span>}
                      </td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="space-y-3 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-foreground">3. Hoa hồng Sales</h3>
            {canCompletePayout && detail.payouts.some(x=>x.status==='APPROVED') && <Button size="sm" variant="outline" disabled={saving}
              onClick={()=>{setActionError('');setEntryMode('payout');}}><Plus className="size-4"/> Thêm khoản chi</Button>}
            {!detail.payouts.some(x=>x.status==='APPROVED') && canCreatePayout && <div className="flex flex-wrap items-center gap-2">
              {eligiblePeriods.length>0 && <select aria-label="Kỳ hoa hồng để lập phiếu chi" value={chosenPeriod}
                onChange={event=>setPayoutPeriod(event.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
                {eligiblePeriods.map(period=><option key={period} value={period}>Kỳ {period} · {channelMoney(eligibleByPeriod.get(period) ?? 0)}</option>)}
              </select>}
              <Button size="sm" variant="outline" disabled={saving || !chosenPeriod}
                onClick={()=>void createPayout()}><Plus className="size-4"/> Lập phiếu chi</Button>
            </div>}
          </div>
          {canCreatePayout && eligiblePeriods.length===0 && !detail.payouts.some(x=>x.status==='APPROVED') && <p className="text-xs text-muted-foreground">
            {detail.ledger.length===0 ? 'Chưa có hoa hồng phát sinh cho hợp đồng này.'
              : detail.ledger.some(x=>!x.reconciled) ? 'Hoa hồng chưa có hồ sơ đối soát CHECKEE đã xác nhận.'
              : detail.ledger.every(x=>x.assigned_to_payout) ? 'Hoa hồng đã được đưa vào phiếu chi. Xem trạng thái phiếu chi bên dưới.'
              : 'Chưa có khoản hoa hồng dương đủ điều kiện lập phiếu chi.'}
          </p>}
          {detail.ledger.some(x=>x.entry_type!=='ACCRUAL') && <div className="rounded-lg border border-border/80 px-3 py-2 text-xs text-muted-foreground">
            Có điều chỉnh hoa hồng. Chi tiết: {detail.ledger.filter(x=>x.entry_type!=='ACCRUAL').map(x=>`${x.reason || 'Điều chỉnh'} (${channelMoney(x.amount)})`).join('; ')}
          </div>}
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Ngày chuyển</th>
                  <th className="px-3 py-3">Mã giao dịch</th>
                  <th className="px-3 py-3 text-right">Số tiền</th>
                  <th className="w-16 px-3 py-3 text-center">Ảnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {detail.payouts.filter(x=>x.status==='PAID').length===0 ?
                  <tr><td colSpan={4} className="px-3 py-7 text-center text-muted-foreground">Chưa có khoản chi hoa hồng nào.</td></tr>
                  : detail.payouts.filter(x=>x.status==='PAID').map(x=>{
                    const proof = detail.evidence.find(e=>e.payout_id===x.id);
                    return <tr key={x.id} className="hover:bg-muted/20">
                      <td className="whitespace-nowrap px-3 py-3">{x.paid_at ? channelDate(x.paid_at) : '—'}</td>
                      <td className="max-w-[160px] break-words px-3 py-3">{x.payment_reference || x.code}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">{channelMoney(x.net_amount)}</td>
                      <td className="px-3 py-2 text-center">
                        {proof ? <Button type="button" variant="outline" size="icon" title="Xem ảnh chuyển hoa hồng"
                          aria-label={`Xem chứng từ khoản chi ${x.code}`}
                          onClick={()=>void viewEvidence(proof.id,proof.file_name)}><ImageIcon className="size-4"/></Button>
                          : <span className="text-muted-foreground" aria-label="Không có ảnh chứng từ">—</span>}
                      </td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
          {detail.payouts.some(x=>x.status!=='PAID') && <div className="space-y-2 rounded-lg border border-border/80 p-3">
            <h4 className="font-semibold">Phiếu chi đang xử lý</h4>
            {detail.payouts.filter(x=>x.status!=='PAID').map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">{x.code} · {x.status}</span>
              {x.status==='DRAFT' && canApprovePayout && <Button size="sm" variant="outline" disabled={saving}
                onClick={()=>void approvePayout(x.id)}>Duyệt phiếu chi</Button>}
            </div>)}
          </div>}
        </section>
        {actionError && <p role="alert" className="rounded-lg border border-red-300 p-3 text-red-700">{actionError}</p>}
      </div>}
    </AppDrawer>
    <AppDialog open={Boolean(detail && entryMode)} onOpenChange={open=>{if(!open && !saving)setEntryMode(null);}}
      busy={saving} title={entryMode==='receipt'?'Thêm khoản thu từ nhà trường':'Thêm khoản chi hoa hồng'}
      description="Nhập đúng ngày, số tiền và ảnh chứng từ cho giao dịch.">
      {detail && entryMode && <form className="space-y-4" onSubmit={event=>void sendRecord(event)}>
        {entryMode==='receipt' ? <label className="block space-y-1"><span>Đợt thanh toán *</span>
          <select name="schedule_id" required className="w-full rounded-lg border bg-background p-2">
            {detail.schedules.filter(x=>x.amount_received<x.amount_due).map(x=><option key={x.id} value={x.id}>
              {channelDate(x.due_on)} · Còn {channelMoney(x.amount_due-x.amount_received)}</option>)}
          </select></label> : <label className="block space-y-1"><span>Phiếu chi đã duyệt *</span>
          <select name="payout_id" required className="w-full rounded-lg border bg-background p-2">
            {detail.payouts.filter(x=>x.status==='APPROVED').map(x=><option key={x.id} value={x.id}>{x.code} · {channelMoney(x.net_amount)}</option>)}
          </select></label>}
        <div className="space-y-1"><label htmlFor="accounting-transaction-date">Ngày giao dịch *</label>
          <Input id="accounting-transaction-date" type="date" name="transaction_date" required defaultValue={new Date().toISOString().slice(0,10)}/></div>
        <div className="space-y-1"><label htmlFor="accounting-amount">{entryMode==='receipt'?'Số tiền nhà trường thực trả (VNĐ) *':'Số tiền đã chuyển (VNĐ) *'}</label>
          <Input id="accounting-amount" name="amount" type="number" min={1} step={1} required
            defaultValue={entryMode==='payout'?detail.payouts.find(x=>x.status==='APPROVED')?.net_amount:undefined}/></div>
        {entryMode==='payout' && <p className="text-xs text-muted-foreground">Số tiền chi phải khớp phiếu chi đã duyệt; chưa hỗ trợ chia nhỏ một phiếu chi.</p>}
        <div className="space-y-1"><label htmlFor="accounting-bank-reference">Mã giao dịch ngân hàng *</label>
          <Input id="accounting-bank-reference" name="reference_code" required maxLength={64}/></div>
        <div className="space-y-1"><label htmlFor="accounting-bank-proof">Ảnh chứng từ chuyển khoản *</label>
          <Input id="accounting-bank-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required/>
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · tối đa 5 MB · lưu riêng tư theo phân quyền</p></div>
        {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" disabled={saving} onClick={()=>setEntryMode(null)}>Hủy</Button>
          <Button type="submit" disabled={saving}>{saving?'Đang lưu...':'Lưu giao dịch'}</Button>
        </div>
      </form>}
    </AppDialog>
    <AppDialog open={preview!==null} onOpenChange={open=>{if(!open)closePreview();}} title={preview?.name??'Ảnh chuyển khoản'}
      description="Chứng từ riêng tư – chỉ sử dụng để đối soát." contentClassName="sm:!max-w-4xl">
      {preview && <object data={preview.url} type={preview.mime} aria-label={preview.name} className="mx-auto h-[min(68dvh,620px)] w-full object-contain">Không thể xem ảnh này trên trình duyệt.</object>}
    </AppDialog>
  </div>;
}

function Metric({ label, value }: {label:string;value:string}) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-bold tabular-nums">{value}</p></div>;
}
