'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { AlertCircle, Eye, RefreshCw, Search } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppPageHeader } from '@/components/common/app-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest } from '@/lib/channel-operations';

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
  data: { id: number; contract_code: string; school_name: string; owner_name: string; personnel_type: string | null;
    signed_on: string; effective_on: string | null; status: string; total_value: number; evidence_reference: string | null; owner_organization_id: number; owner_user_id: number };
  schedules: { id: number; due_on: string; amount_due: number; amount_received: number; status: string }[];
  receipts: { id: number; received_at: string; amount: number; reference_code: string; payment_method: string }[];
  ledger: { id: number; entry_type: string; amount: number; rate_percent: number; reason: string | null; occurred_at: string }[];
  payouts: { id: number; code: string; net_amount: number; status: string; paid_at: string | null; payment_reference: string | null }[];
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

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
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
      const date = form.get('transaction_date')?.toString() ?? '';
      const timestamp = new Date(date + 'T12:00:00+07:00').toISOString();
      if (entryMode === 'receipt') {
        await channelRequest(apiBase, token, `/contracts/${selected}/revenue-receipts`, {
          method: 'POST', body: JSON.stringify({
            idempotency_key: crypto.randomUUID(), revenue_schedule_id: Number(form.get('schedule_id')),
            received_at: timestamp, amount: Number(form.get('amount')),
            reference_code: form.get('reference_code')?.toString() ?? '',
            payment_method: 'BANK_TRANSFER', evidence_id: uploaded.data.id,
          }),
        });
      } else {
        await channelRequest(apiBase, token, `/payouts/${payoutId}/complete`, {
          method: 'POST', body: JSON.stringify({
            paid_at: timestamp, payment_reference: form.get('reference_code')?.toString() ?? '',
            evidence_id: uploaded.data.id,
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
      const date = new Date();
      const period = new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(date);
      const payoutPeriod = period.replace(/\/(\d\d)$/, '-$1');
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
              <th className="px-4 py-3">Trường chính / HĐ</th>
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
    <AppDrawer open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}
      title={detail?.data.school_name ?? 'Chi tiết hợp đồng'}
      description={detail?.data.contract_code ?? 'Đang tải hợp đồng'}>
      {!detail ? <p className="text-sm text-muted-foreground">Đang tải chi tiết...</p> : <div className="space-y-6 text-sm">
        <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
          <Metric label="Giá trị hợp đồng" value={channelMoney(detail.data.total_value)}/>
          <Metric label="Nhà trường đã trả" value={channelMoney(detail.receipts.reduce((sum, x) => sum + x.amount, 0))}/>
          <Metric label="Hoa hồng phát sinh" value={channelMoney(detail.ledger.reduce((sum, x) => sum + x.amount, 0))}/>
          <Metric label="Phiếu chi liên quan" value={String(detail.payouts.length)}/>
        </div>
        <section className="space-y-2">
          <h3 className="font-semibold">Hồ sơ hợp đồng</h3>
          <p>Mã: {detail.data.contract_code} · Người phụ trách: {detail.data.owner_name}</p>
          <p>Ngày ký: {detail.data.signed_on} · Trạng thái: {detail.data.status}</p>
          <p>Tham chiếu hợp đồng: {detail.data.evidence_reference ?? 'Chưa có'}</p>
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">Lịch thanh toán theo hợp đồng</h3>
          {detail.schedules.map(x => <div key={x.id} className="flex justify-between border-b py-2">
            <span>Hạn: {x.due_on}<span className="block text-xs text-muted-foreground">{x.status}</span></span>
            <span className="text-right">{channelMoney(x.amount_due)}<span className="block text-xs text-muted-foreground">Đã thu {channelMoney(x.amount_received)}</span></span>
          </div>)}
        </section>
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Nhà trường đã thanh toán</h3>{canRecordRevenue && detail.data.status === 'ACTIVE' && <Button size="sm" variant="outline" disabled={saving} onClick={() => {setActionError('');setEntryMode('receipt');}}>Ghi nhận thực thu</Button>}</div>
          {detail.receipts.length === 0 && <p className="text-muted-foreground">Chưa ghi nhận khoản thu.</p>}
          {detail.receipts.map(x => <div key={x.id} className="flex justify-between border-b py-2">
            <span>{channelDate(x.received_at)}<span className="block text-xs text-muted-foreground">{x.reference_code}</span></span>
            <span className="font-medium">{channelMoney(x.amount)}</span>
          </div>)}
        </section>
        <section className="space-y-2">
          <h3 className="font-semibold">Hoa hồng và điều chỉnh</h3>
          {detail.ledger.length === 0 && <p className="text-muted-foreground">Chưa có bút toán hoa hồng.</p>}
          {detail.ledger.map(x => <div key={x.id} className="flex justify-between border-b py-2">
            <span>{x.entry_type === 'ACCRUAL' ? `Phát sinh ${x.rate_percent}%` : 'Điều chỉnh'}<span className="block text-xs text-muted-foreground">{x.reason ?? channelDate(x.occurred_at)}</span></span>
            <span className="font-medium">{channelMoney(x.amount)}</span>
          </div>)}
        </section>
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Lịch sử chi hoa hồng</h3>{canCreatePayout && <Button size="sm" variant="outline" disabled={saving} onClick={() => void createPayout()}>Lập phiếu chi</Button>}</div>
          {detail.payouts.length === 0 && <p className="text-muted-foreground">Chưa có phiếu chi.</p>}
          {detail.payouts.map(x => <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
            <span>{x.code}<span className="block text-xs text-muted-foreground">{x.paid_at ? channelDate(x.paid_at) : x.status}</span></span>
            <span className="font-medium">{channelMoney(x.net_amount)}</span>
            {x.status === 'DRAFT' && canApprovePayout && <Button size="sm" variant="outline" disabled={saving} onClick={() => void approvePayout(x.id)}>Duyệt phiếu chi</Button>}
            {x.status === 'APPROVED' && canCompletePayout && <Button size="sm" variant="outline" disabled={saving} onClick={() => {setActionError('');setEntryMode('payout');}}>Ghi nhận đã chuyển</Button>}
          </div>)}
        </section>
        {actionError && <p role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-red-700">{actionError}</p>}
        {entryMode && <form className="space-y-3 rounded-lg border p-4" onSubmit={event => void sendRecord(event)}>
          <h3 className="font-semibold">{entryMode === 'receipt' ? 'Ghi nhận tiền nhà trường' : 'Ghi nhận đã chuyển hoa hồng'}</h3>
          {entryMode === 'receipt' ? <label className="block space-y-1">
            <span>Đợt thanh toán *</span>
            <select name="schedule_id" required className="w-full rounded-lg border bg-background p-2">
              {detail.schedules.filter(x => x.amount_received < x.amount_due).map(x =>
                <option key={x.id} value={x.id}>{x.due_on} · Còn {channelMoney(x.amount_due - x.amount_received)}</option>)}
            </select>
          </label> : <label className="block space-y-1">
            <span>Phiếu chi đã duyệt *</span>
            <select name="payout_id" required className="w-full rounded-lg border bg-background p-2">
              {detail.payouts.filter(x => x.status === 'APPROVED').map(x =>
                <option key={x.id} value={x.id}>{x.code} · {channelMoney(x.net_amount)}</option>)}
            </select>
          </label>}
          <div className="block space-y-1"><label htmlFor="accounting-transaction-date">Ngày giao dịch *</label><Input id="accounting-transaction-date" type="date" name="transaction_date" required defaultValue={new Date().toISOString().slice(0, 10)}/></div>
          {entryMode === 'receipt' && <div className="block space-y-1"><label htmlFor="accounting-receipt-amount">Số tiền nhà trường thực trả (VNĐ) *</label>
            <Input id="accounting-receipt-amount" type="number" min={1} step={1} name="amount" required /></div>}
          <div className="block space-y-1"><label htmlFor="accounting-bank-reference">Mã giao dịch / tham chiếu *</label><Input id="accounting-bank-reference" name="reference_code" required maxLength={64}/></div>
          <div className="block space-y-1"><label htmlFor="accounting-bank-proof">Ảnh chuyển khoản *</label>
            <Input id="accounting-bank-proof" type="file" name="proof" accept="image/jpeg,image/png,image/webp" required/>
            <span className="block text-xs text-muted-foreground">JPG, PNG hoặc WEBP · Tối đa 5 MB · Chỉ người có quyền mới xem được</span>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu giao dịch và ảnh chứng từ'}</Button>
            <Button type="button" variant="outline" onClick={() => setEntryMode(null)} disabled={saving}>Hủy</Button>
          </div>
        </form>}
        <p className="rounded-lg border p-3 text-xs text-muted-foreground">
          Kế toán xác nhận tiền đã vào tài khoản trước khi ghi thực thu. Mỗi giao dịch phải có ảnh chuyển khoản
          và được lưu theo quyền truy cập nội bộ.
        </p>
      </div>}
    </AppDrawer>
  </div>;
}

function Metric({ label, value }: {label: string; value: string}) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold tabular-nums">{value}</div></div>;
}
