'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Eye, FileText, Image as ImageIcon, MapPin, Plus, RefreshCw, Search, UserRound } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppPageHeader } from '@/components/common/app-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest, currentBusinessPeriod } from '@/lib/channel-operations';

type ContractRow = {
  id: number;
  contract_code: string;
  school_name: string;
  owner_name: string;
  personnel_type: string | null;
  total_value: number;
  received: number;
  refunded: number;
  commission: number;
  contract_status: string;
};
type ContractList = { data: ContractRow[]; total: number; page: number; page_size: number };
type Detail = {
  data: { id: number; contract_code: string; school_name: string; school_address: string | null; school_district: string | null; school_province: string | null; owner_name: string; personnel_type: string | null;
    signed_on: string; effective_on: string | null; status: string; total_value: number; evidence_reference: string | null; owner_organization_id: number; owner_user_id: number; service_plan:string|null;student_count:number|null };
  schedules: { id: number; due_on: string; amount_due: number; amount_received: number; status: string }[];
  receipts: { id: number; received_at: string; amount: number; reference_code: string; payment_method: string }[];
  ledger: { id: number; entry_type: string; amount: number; rate_percent: number; reason: string | null; occurred_at: string }[];
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
  const [personnel, setPersonnel] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const [entryMode, setEntryMode] = useState<'receipt' | 'payout' | null>(null);
  const [preview, setPreview] = useState<{url:string; name:string}|null>(null);
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
      const params = new URLSearchParams({ page: String(page), page_size: '20', personnel_type: personnel });
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
      const result = await channelRequest<ContractList>(apiBase, token, `/accounting/contracts?${params.toString()}`);
      setRows(result.data);
      setTotal(result.total);
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : 'Không tải được hợp đồng.');
    } finally {
      setBusy(false);
    }
  }, [apiBase, token, page, appliedSearch, personnel, connected]);
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
        setPreview(old => { if (old) URL.revokeObjectURL(old.url); return {url, name}; });
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
  const createPayout = async () => {
    if (!detail) return;
    setSaving(true);
    setActionError('');
    try {
      const payoutPeriod = currentBusinessPeriod();
      await channelRequest(apiBase, token, '/payouts', {method:'POST',body:JSON.stringify({
        idempotency_key: crypto.randomUUID(), organization_id: detail.data.owner_organization_id,
        beneficiary_user_id: detail.data.owner_user_id, period: payoutPeriod,
        withholding_amount: 0,
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
  const pages = Math.max(1, Math.ceil(total / 20));
  return <div className="space-y-5">
    <AppPageHeader eyebrow="KẾ TOÁN / KIDSFIT CRM" title="Hợp đồng & hoa hồng"
      description="Đối chiếu số tiền nhà trường thanh toán và hoa hồng của từng Nhân viên/CTV." />
    {!connected && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">Cần đăng nhập bằng tài khoản có quyền xem hoa hồng để tải dữ liệu thực tế.</p>}
    {error && <p role="alert" className="flex items-center gap-2 rounded-lg border border-red-300 p-3 text-sm text-red-700"><AlertCircle className="size-4"/>{error}</p>}
    <section className="overflow-hidden rounded-xl border bg-card">
      <form className="flex flex-wrap items-center gap-3 border-b p-4" onSubmit={submitSearch}>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <Input value={search} onChange={event => setSearch(event.target.value)}
            aria-label="Tìm kiếm hợp đồng" placeholder="Tìm tên trường, hợp đồng, nhân sự..." className="pl-9"/>
        </div>
        <select aria-label="Lọc nhân sự" className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          value={personnel} onChange={event => {setPersonnel(event.target.value); setPage(1);}}>
          <option value="ALL">Tất cả nhân sự</option>
          <option value="SALES">Nhân viên</option>
          <option value="COLLABORATOR">CTV</option>
        </select>
        <Button type="submit" variant="outline">Tìm kiếm</Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => void load()} disabled={busy} aria-label="Làm mới"><RefreshCw className="size-4"/></Button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[930px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nhà trường</th>
              <th className="px-4 py-3">Phụ trách</th>
              <th className="px-4 py-3 text-right">Giá trị hợp đồng</th>
              <th className="px-4 py-3 text-right">Thực thu</th>
              <th className="px-4 py-3 text-right">Hoa hồng</th>
              <th className="px-4 py-3 text-center"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(row => <tr key={row.id} className="hover:bg-muted/20">
              <td className="px-4 py-3"><div className="font-medium">{row.school_name}</div><div className="text-xs text-muted-foreground">{row.contract_code}</div></td>
              <td className="px-4 py-3"><div>{row.owner_name}</div><div className="text-xs text-muted-foreground">{row.personnel_type === 'COLLABORATOR' ? 'CTV' : 'Nhân viên'}</div></td>
              <td className="px-4 py-3 text-right tabular-nums">{channelMoney(row.total_value)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{channelMoney(row.received - row.refunded)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{channelMoney(row.commission)}</td>
              <td className="px-4 py-3 text-center">
                <Button type="button" variant="ghost" size="icon" onClick={() => setSelected(row.id)}
                  aria-label={`Xem chi tiết ${row.contract_code}`} title="Xem chi tiết"><Eye className="size-4"/></Button>
              </td>
            </tr>)}
            {!busy && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Không có hợp đồng phù hợp.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
        <span>{busy ? 'Đang tải...' : `${total} hợp đồng`}</span>
        <div className="flex items-center gap-3">
          <span>Trang {page}/{pages}</span>
          <Button variant="outline" size="sm" disabled={page <= 1 || busy} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <Button variant="outline" size="sm" disabled={page >= pages || busy} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      </div>
    </section>
    <AppDrawer wide open={selected !== null} onOpenChange={open => { if (!open) {setSelected(null);setEntryMode(null);closePreview();} }}
      title="Chi tiết hợp đồng" description={detail?.data.contract_code ?? 'Đang tải thông tin'}>
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
          <span className="inline-flex rounded-full border px-2 py-1 text-xs font-medium">{detail.data.status === 'ACTIVE' ? 'Hợp đồng hợp lệ' : detail.data.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Giá trị hợp đồng" value={channelMoney(detail.data.total_value)}/>
          <Metric label="Nhà trường đã trả" value={channelMoney(detail.receipts.reduce((sum,x)=>sum+x.amount,0))}/>
          <Metric label="Hoa hồng" value={channelMoney(detail.ledger.reduce((sum,x)=>sum+x.amount,0))}/>
          <Metric label="Hoa hồng đã chuyển" value={channelMoney(detail.payouts.filter(x=>x.status==='PAID').reduce((sum,x)=>sum+x.net_amount,0))}/>
        </div>
        <section className="space-y-3 border-t pt-5">
          <h3 className="flex items-center gap-2 text-base font-semibold"><FileText className="size-5 text-muted-foreground"/>1. Thông tin hợp đồng</h3>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Mã hợp đồng</dt><dd className="mt-1 font-medium">{detail.data.contract_code}</dd></div>
            <div><dt className="text-muted-foreground">Ngày ký</dt><dd className="mt-1 font-medium">{channelDate(detail.data.signed_on)}</dd></div>
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
            <h3 className="flex items-center gap-2 text-base font-semibold"><ArrowDownToLine className="size-5 text-emerald-600"/>2. Nhà trường thanh toán</h3>
            {canRecordRevenue && detail.data.status==='ACTIVE' && <Button size="sm" disabled={saving || !detail.schedules.some(x=>x.amount_received<x.amount_due)}
              onClick={()=>{setActionError('');setEntryMode('receipt');}}><Plus className="size-4"/> Thêm khoản thu</Button>}
          </div>
          <div className="grid gap-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
            <MetricLine label="Nhà trường đã trả" value={channelMoney(detail.receipts.reduce((sum,x)=>sum+x.amount,0))}/>
            <MetricLine label="Còn phải thanh toán" value={channelMoney(Math.max(0,detail.data.total_value-detail.receipts.reduce((sum,x)=>sum+x.amount,0)))}/>
          </div>
          {detail.receipts.length===0 ? <p className="py-3 text-center text-muted-foreground">Chưa có khoản thu nào.</p> : <div className="space-y-1">
            {detail.receipts.map(x=><div key={x.id} className="flex items-center justify-between gap-3 border-b py-3">
              <div><div>{channelDate(x.received_at)}</div><div className="text-xs text-muted-foreground">{x.reference_code}</div></div>
              <div className="flex items-center gap-3"><span className="font-medium tabular-nums">{channelMoney(x.amount)}</span>
                {detail.evidence.filter(e=>e.revenue_receipt_id===x.id).map(e=><Button key={e.id} type="button" variant="ghost" size="icon"
                  title="Xem ảnh nhà trường chuyển khoản" aria-label="Xem ảnh nhà trường chuyển khoản" onClick={()=>void viewEvidence(e.id,e.file_name)}>
                  <ImageIcon className="size-4"/></Button>)}
              </div>
            </div>)}
          </div>}
        </section>
        <section className="space-y-3 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-semibold"><ArrowUpFromLine className="size-5 text-muted-foreground"/>3. Hoa hồng Sales/CTV</h3>
            {canCompletePayout && detail.payouts.some(x=>x.status==='APPROVED') && <Button size="sm" variant="outline" disabled={saving}
              onClick={()=>{setActionError('');setEntryMode('payout');}}><Plus className="size-4"/> Thêm khoản chi</Button>}
            {!detail.payouts.some(x=>x.status==='APPROVED') && canCreatePayout && <Button size="sm" variant="outline" disabled={saving}
              onClick={()=>void createPayout()}><Plus className="size-4"/> Lập phiếu chi</Button>}
          </div>
          <div className="grid gap-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-3">
            <MetricLine label="Tổng hoa hồng" value={channelMoney(detail.ledger.reduce((sum,x)=>sum+x.amount,0))}/>
            <MetricLine label="Đã chuyển" value={channelMoney(detail.payouts.filter(x=>x.status==='PAID').reduce((sum,x)=>sum+x.net_amount,0))}/>
            <MetricLine label="Chưa chuyển" value={channelMoney(Math.max(0,detail.ledger.reduce((sum,x)=>sum+x.amount,0)-detail.payouts.filter(x=>x.status==='PAID').reduce((sum,x)=>sum+x.net_amount,0)))}/>
          </div>
          {detail.ledger.filter(x=>x.entry_type!=='ACCRUAL').length>0 && <div className="rounded-lg border p-3">
            <p className="font-medium">Các khoản điều chỉnh hoa hồng</p>
            {detail.ledger.filter(x=>x.entry_type!=='ACCRUAL').map(x=><div key={x.id} className="flex justify-between gap-2 py-1">
              <span className="text-muted-foreground">{x.reason ?? 'Điều chỉnh'} </span><span>{channelMoney(x.amount)}</span>
            </div>)}
          </div>}
          {detail.payouts.length===0 && <p className="py-3 text-center text-muted-foreground">Chưa có lịch sử chuyển hoa hồng.</p>}
          {detail.payouts.map(x=><div key={x.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3">
            <div><div className="font-medium">{x.code}</div><div className="text-xs text-muted-foreground">{x.paid_at ? channelDate(x.paid_at) : x.status}</div></div>
            <div className="flex items-center gap-2"><span className="tabular-nums">{channelMoney(x.net_amount)}</span>
              {detail.evidence.filter(e=>e.payout_id===x.id).map(e=><Button key={e.id} variant="ghost" size="icon" title="Xem ảnh chuyển hoa hồng" aria-label="Xem ảnh chuyển hoa hồng"
                onClick={()=>void viewEvidence(e.id,e.file_name)}><ImageIcon className="size-4"/></Button>)}
              {x.status==='DRAFT' && canApprovePayout && <Button size="sm" variant="outline" disabled={saving} onClick={()=>void approvePayout(x.id)}>Duyệt phiếu chi</Button>}
            </div>
          </div>)}
        </section>
        {actionError && <p role="alert" className="rounded-lg border border-red-300 p-3 text-red-700">{actionError}</p>}
        <p className="text-xs text-muted-foreground">Kế toán xác nhận tiền đã thực sự vào tài khoản trước khi thêm khoản thu. Mỗi khoản thu và chi đều phải kèm ảnh chuyển khoản.</p>
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
      {preview && <object data={preview.url} type="image/png" aria-label={preview.name} className="mx-auto h-[min(68dvh,620px)] w-full object-contain">Không thể xem ảnh này trên trình duyệt.</object>}
    </AppDialog>
  </div>;
}

function Metric({ label, value }: {label:string;value:string}) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-bold tabular-nums">{value}</p></div>;
}
function MetricLine({label,value}:{label:string;value:string}) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>;
}
