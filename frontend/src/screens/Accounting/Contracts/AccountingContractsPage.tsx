'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { ExternalLink, Eye, FileText, Image as ImageIcon, MapPin, Plus, RotateCcw, Search, UserRound } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppPagination } from '@/components/common/app-pagination';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppButton } from '@/components/common/buttons/app-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { channelDate, channelMoney, channelRequest, ChannelRequestError } from '@/lib/channel-operations';

const accountingBusinessDay = (date: Date) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

type FieldErrors = Partial<Record<'transaction_date' | 'amount' | 'reference_code' | 'proof' | 'schedule_id' | 'payout_id', string>>;

type ServicePeriod = { start_on:string; end_on:string; payment_cycle:string;
  renewal_id:number|null; renewal_no:number|null; gap_reason:string|null };
type ContractRow = {
  current_period:ServicePeriod|null;
  next_confirmed_period:ServicePeriod|null;
  latest_confirmed_period:ServicePeriod|null;
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
  service_start_on: string | null;
  service_end_on: string | null;
  payment_cycle: string | null;
};
type ContractList = { data: ContractRow[]; owners?: { id: number; name: string }[] | null; total: number; page: number; page_size: number };
type Detail = {
  current_period:ServicePeriod|null;
  next_confirmed_period:ServicePeriod|null;
  latest_confirmed_period:ServicePeriod|null;
  previous_period:ServicePeriod|null;
  period_history:ServicePeriod[];
  data: { id: number; contract_code: string; school_name: string; school_address: string | null; school_district: string | null; school_province: string | null; owner_name: string; personnel_type: string | null;
    signed_on: string; effective_on: string | null; status: string; verified_at: string | null; total_value: number; evidence_reference: string | null; owner_organization_id: number; owner_user_id: number; service_plan:string|null;student_count:number|null;
    service_start_on:string|null;service_end_on:string|null;payment_cycle:string|null;
    protection_until:string|null };
  schedules: { id: number; due_on: string; amount_due: number; amount_received: number; status: string }[];
  receipts: { id: number; received_at: string; amount: number; reference_code: string; payment_method: string }[];
  ledger: { id: number; entry_type: string; amount: number; rate_percent: number; reason: string | null; occurred_at: string;
    period: string; beneficiary_user_id: number; beneficiary_organization_id: number; assigned_to_payout: boolean; reconciled: boolean }[];
  payouts: { id: number; code: string; net_amount: number; status: string; paid_at: string | null; payment_reference: string | null }[];
  evidence: {id:number;kind:string;file_name:string;revenue_receipt_id:number|null;payout_id:number|null}[];
  school_units: {id:number;name:string}[];
};

export function AccountingContractsPage({ apiBase, token, abilities, financialView }: {
  apiBase: string; token: string; abilities: string[]; onChanged: () => Promise<void>;
  financialView: 'CURRENT' | 'HISTORY';
}) {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('ALL');
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [termFormOpen,setTermFormOpen] = useState(false);
  const [termStart,setTermStart] = useState('');
  const [termEnd,setTermEnd] = useState('');
  const [termCycle,setTermCycle] = useState('YEARLY');
  const [termError,setTermError] = useState('');
  const [termSaving,setTermSaving] = useState(false);

  const canView = abilities.includes('channel_sales.commission.view') || abilities.includes('*');
  const connected = Boolean(apiBase && token && canView);
  const load = useCallback(async () => {
    if (!connected) return;
    setBusy(true);
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
      appNotice.error('Không tải được danh sách hợp đồng.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
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
      .catch(cause => { if (live) appNotice.error('Không tải được chi tiết hợp đồng.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'); });
    return () => { live = false; };
  }, [apiBase, token, selected, connected, detailRevision]);

  // A twelve-month date is only a suggestion: the signed contract is authoritative.
  const suggestTermEnd = (start: string) => {
    const parts = start.split('-').map(Number);
    if (parts.length !== 3 || parts.some(n=>!Number.isInteger(n))) return '';
    const [year,month,day] = parts;
    const end = new Date(Date.UTC(year+1,month-1,day-1));
    return end.toISOString().slice(0,10);
  };
  const saveTerm = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !termStart || !termEnd || termEnd < termStart) {
      setTermError('Nhập ngày bắt đầu và kết thúc hợp lệ theo hợp đồng đã ký.'); return;
    }
    setTermError('');setTermSaving(true);
    try {
      await channelRequest(apiBase,token,`/accounting/contracts/${selected}/service-term`,{
        method:'PUT',body:JSON.stringify({
          service_start_on:termStart,service_end_on:termEnd,payment_cycle:termCycle
        })
      });
      setTermFormOpen(false);
      setDetailRevision(n=>n+1);
      void load();
      appNotice.success('Đã ghi nhận thời hạn dịch vụ theo hợp đồng.');
    } catch (err) {
      if (err instanceof ChannelRequestError && err.status === 422) {
        setTermError(Object.values(err.errors).flat()[0] ?? err.message);
      } else appNotice.error('Không thể ghi nhận thời hạn dịch vụ.',err instanceof Error?err.message:'Vui lòng thử lại.');
    } finally {setTermSaving(false);}
  };
  const serviceStatus = (start:string|null,end:string|null,contractStatus:string) => {
    if (contractStatus === 'CANCELLED') return 'Đã hủy hợp đồng';
    if (!start || !end) return 'Chưa cập nhật';
    const today = accountingBusinessDay(new Date());
    if (today < start) return 'Chưa bắt đầu';
    if (today > end) return 'Đã hết hạn';
    const warning = new Date(today + 'T00:00:00Z');
    warning.setUTCDate(warning.getUTCDate()+30);
    return end <= warning.toISOString().slice(0,10)?'Sắp hết hạn':'Còn hiệu lực';
  };

  const viewEvidence = async (id: number, name: string, inNewTab = false) => {
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
      appNotice.error('Không mở được chứng từ.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
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
    const dateValue = form.get('transaction_date');
    const date = typeof dateValue === 'string' ? dateValue : '';
    const amount = Number(form.get('amount'));
    const referenceValue = form.get('reference_code');
    const reference = typeof referenceValue === 'string' ? referenceValue.trim() : '';
    const today = accountingBusinessDay(new Date());
    const signedOn = accountingBusinessDay(new Date(detail.data.signed_on));
    const validation: FieldErrors = {};
    if (!date) validation.transaction_date = 'Vui lòng chọn ngày giao dịch.';
    else if (date > today || (entryMode === 'receipt' && date < signedOn))
      validation.transaction_date = entryMode === 'receipt'
        ? 'Ngày thu phải từ ngày ký hợp đồng đến hiện tại.'
        : 'Ngày chi không được ở tương lai.';
    if (!Number.isSafeInteger(amount) || amount <= 0) validation.amount = 'Số tiền phải là số nguyên dương.';
    if (!reference) validation.reference_code = 'Vui lòng nhập mã giao dịch ngân hàng.';
    if (!(proof instanceof File) || proof.size === 0) validation.proof = 'Vui lòng chọn ảnh chứng từ chuyển khoản.';
    else if (proof.size > 5 * 1024 * 1024) validation.proof = 'Ảnh chứng từ không được vượt quá 5 MB.';
    else if (!['image/jpeg', 'image/png', 'image/webp'].includes(proof.type))
      validation.proof = 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.';
    if (entryMode === 'receipt' && !Number(form.get('schedule_id'))) validation.schedule_id = 'Vui lòng chọn đợt thanh toán.';
    if (entryMode === 'payout' && !Number(form.get('payout_id'))) validation.payout_id = 'Vui lòng chọn phiếu chi đã duyệt.';
    if (Object.keys(validation).length) { setFieldErrors(validation); return; }
    if (!(proof instanceof File)) return;
    setFieldErrors({});
    setSaving(true);
    try {
      const attachment = new FormData();
      attachment.set('kind', entryMode === 'receipt' ? 'RECEIPT' : 'PAYOUT');
      attachment.set('file', proof);
      const payoutId = Number(form.get('payout_id'));
      if (entryMode === 'receipt') attachment.set('contract_id', String(selected));
      else attachment.set('payout_id', String(payoutId));
      const uploaded = await channelRequest<{data:{id:number}}>(apiBase, token, '/evidence', { method: 'POST', body: attachment });
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
      appNotice.success(entryMode === 'receipt' ? 'Đã ghi nhận khoản thu.' : 'Đã ghi nhận khoản chi hoa hồng.');
      await load();
    } catch (cause) {
      if (cause instanceof ChannelRequestError && cause.status === 422 && Object.keys(cause.errors).length) {
        const next: FieldErrors = {};
        for (const [key, messages] of Object.entries(cause.errors)) {
          if (key in {transaction_date: true, received_at: true, paid_at: true, amount: true, reference_code: true, proof: true, schedule_id: true, revenue_schedule_id: true, payout_id: true}) {
            const target = key === 'received_at' || key === 'paid_at' ? 'transaction_date'
              : key === 'revenue_schedule_id' ? 'schedule_id' : key as keyof FieldErrors;
            next[target] = messages[0];
          }
        }
        if (Object.keys(next).length) setFieldErrors(next);
        else appNotice.error('Không thể lưu giao dịch.', cause.message);
      } else {
        appNotice.error('Không thể lưu giao dịch.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
      }
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
    try {
      await channelRequest(apiBase, token, '/payouts', {method:'POST',body:JSON.stringify({
        idempotency_key: crypto.randomUUID(), organization_id: detail.data.owner_organization_id,
        beneficiary_user_id: detail.data.owner_user_id, period: chosenPeriod,
        contract_id: detail.data.id, withholding_amount: 0,
      })});
      setDetailRevision(v => v+1);
      appNotice.success('Đã lập phiếu chi hoa hồng.');
      await load();
    } catch (cause) { appNotice.error('Không tạo được phiếu chi.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  const approvePayout = async (id: number) => {
    setSaving(true);
    try {
      await channelRequest(apiBase, token, `/payouts/${id}/approve`, {method:'POST'});
      setDetailRevision(v => v+1);
      appNotice.success('Đã duyệt phiếu chi.');
    } catch (cause) { appNotice.error('Không duyệt được phiếu chi.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  const resetFilters = () => {
    setSearch('');
    setAppliedSearch('');
    setOwnerUserId('ALL');
    setPage(1);
  };
  return <div className="space-y-5">
    {!connected && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">Cần đăng nhập bằng tài khoản có quyền xem hoa hồng để tải dữ liệu thực tế.</p>}
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
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[#1b5e20] text-xs font-bold uppercase tracking-[.04em] text-white">
            <tr>
              <th scope="col" className="px-5 py-3">Nhà trường</th>
              <th scope="col" className="px-4 py-3">Phụ trách</th>
              <th scope="col" className="px-4 py-3">Dịch vụ</th>
              <th scope="col" className="px-4 py-3 text-right">Giá trị HĐ</th>
              <th scope="col" className="px-4 py-3 text-right">Tài chính</th>
              <th scope="col" className="px-5 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {rows.map(row => {
              const current=row.current_period;
              const next=row.next_confirmed_period;
              const status = current ? serviceStatus(current.start_on, current.end_on, row.contract_status)
                : row.contract_status==='CANCELLED' ? 'Đã hủy hợp đồng'
                : next ? 'Chưa bắt đầu kỳ mới' : 'Không có kỳ đang sử dụng';
              const statusTone = status === 'Còn hiệu lực'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
                : status === 'Sắp hết hạn'
                  ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
                  : 'border-border bg-muted/50 text-muted-foreground';
              return <tr key={row.id} className="transition-colors even:bg-muted/20 hover:bg-muted/40">
                <td className="px-5 py-4 align-middle">
                  <p className="font-semibold text-foreground">{row.school_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.contract_code}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.contract_status === 'PENDING_KIDSFIT' ? 'CHECKEE đã xác minh · Chờ KIDSFIT' : row.contract_status === 'CANCELLED' ? 'Đã hủy · Giữ lịch sử' : row.contract_status === 'REJECTED' ? 'Từ chối sau xác minh' : 'Đã xác minh'}</p>
                </td>
                <td className="px-4 py-4 align-middle">
                  <p className="font-medium">{row.owner_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.personnel_type === 'COLLABORATOR' ? 'CTV' : 'Nhân viên'}</p>
                </td>
                <td className="px-4 py-4 align-middle">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusTone}`}>{status}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{current ? `Đến ${channelDate(current.end_on)}` : 'Chưa có kỳ đang sử dụng'}</p>
                  {next&&<p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">Kỳ tiếp theo đã xác nhận: {channelDate(next.start_on)}</p>}
                </td>
                <td className="px-4 py-4 text-right align-middle tabular-nums font-medium">{channelMoney(row.total_value)}</td>
                <td className="px-4 py-4 text-right align-middle tabular-nums">
                  <p className="font-medium">{channelMoney(row.received - row.refunded)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Thực thu</p>
                  <p className="mt-2 font-semibold">{channelMoney(row.commission)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Hoa hồng ghi nhận</p>
                </td>
                <td className="px-5 py-4 text-center align-middle">
                  <Button type="button" variant="outline" size="icon" onClick={() => setSelected(row.id)}
                    aria-label={`Xem chi tiết ${row.contract_code}`} title={`Xem hợp đồng ${row.contract_code}`}>
                    <Eye className="size-4"/>
                  </Button>
                </td>
              </tr>;
            })}
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
            <div><dt className="text-muted-foreground">Ngày bắt đầu dịch vụ</dt><dd className="mt-1 font-medium">{detail.current_period?channelDate(detail.current_period.start_on):'Không có kỳ đang sử dụng'}</dd></div>
            <div><dt className="text-muted-foreground">Ngày kết thúc dịch vụ</dt><dd className="mt-1 font-medium">{detail.current_period?channelDate(detail.current_period.end_on):'Không có kỳ đang sử dụng'}</dd></div>
            <div><dt className="text-muted-foreground">Chu kỳ thanh toán</dt><dd className="mt-1 font-medium">{detail.current_period?.payment_cycle==='MONTHLY'?'Theo tháng':detail.current_period?.payment_cycle==='YEARLY'?'Theo năm':'Không có kỳ đang sử dụng'}</dd></div>
            <div><dt className="text-muted-foreground">Trạng thái dịch vụ</dt><dd className="mt-1 font-medium">{detail.current_period?serviceStatus(detail.current_period.start_on,detail.current_period.end_on,detail.data.status):'Không có kỳ đang sử dụng'}</dd></div>
            <div><dt className="text-muted-foreground">Hạn bảo vệ Sales đã cấp</dt><dd className="mt-1 font-medium">{detail.data.protection_until?channelDate(detail.data.protection_until):'Chưa ghi nhận cấp quyền còn hiệu lực'}</dd></div>
            <div><dt className="text-muted-foreground">Số học sinh</dt><dd className="mt-1 font-medium">{detail.data.student_count ?? 'Chưa khai báo'}</dd></div>
          </dl>
          <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <h4 className="font-semibold">Kỳ sử dụng và tái ký đã xác nhận</h4>
            {detail.next_confirmed_period&&<p className="text-sm">
              <strong>Kỳ tiếp theo đã xác nhận · Chưa bắt đầu:</strong> {channelDate(detail.next_confirmed_period.start_on)} – {channelDate(detail.next_confirmed_period.end_on)}
            </p>}
            {!detail.current_period&&<p className="text-sm text-amber-700">Hiện không có kỳ sử dụng đang hiệu lực.</p>}
            {detail.period_history.length===0&&<p className="text-muted-foreground">Chưa có kỳ dịch vụ đáng tin cậy.</p>}
            {detail.period_history.map((period,index)=><div key={period.renewal_id??'source'} className="flex flex-wrap justify-between gap-2 border-t border-border/70 pt-2 text-sm">
              <span>{period.renewal_no===null?'Hợp đồng gốc':`Tái ký lần ${period.renewal_no}`} · {channelDate(period.start_on)} – {channelDate(period.end_on)}</span>
              <span className="text-muted-foreground">{detail.current_period?.start_on===period.start_on?'Đang sử dụng':detail.next_confirmed_period?.start_on===period.start_on?'Kỳ tiếp theo':period.end_on<accountingBusinessDay(new Date())?'Đã kết thúc':'Đã xác nhận'}</span>
              {period.gap_reason&&<p className="w-full text-xs text-muted-foreground">Lý do gián đoạn: {period.gap_reason}</p>}
            </div>)}
          </section>
          {canRecordRevenue && detail.data.status==='ACTIVE' && !detail.data.service_start_on && !detail.data.service_end_on && !detail.data.payment_cycle && <div>
            <Button type="button" variant="outline" onClick={()=>{
              setTermStart('');setTermEnd('');setTermCycle('YEARLY');setTermError('');setTermFormOpen(true);
            }}>Ghi nhận thời hạn theo hợp đồng</Button>
          </div>}
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
              onClick={()=>{setFieldErrors({});setEntryMode('receipt');}}><Plus className="size-4"/> Thêm khoản thu</Button>}
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
              onClick={()=>{setFieldErrors({});setEntryMode('payout');}}><Plus className="size-4"/> Thêm khoản chi</Button>}
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
      </div>}
    </AppDrawer>
    <AppDialog open={termFormOpen} onOpenChange={open=>{if(!open&&!termSaving)setTermFormOpen(false);}}
      busy={termSaving} title="Ghi nhận thời hạn dịch vụ" description="Nhập đúng ngày và chu kỳ thanh toán theo hợp đồng đã ký. Chỉ ghi nhận một lần, không sửa lịch thu hoặc hoa hồng.">
      <form noValidate className="space-y-4" onSubmit={event=>void saveTerm(event)}>
        <label htmlFor="kc01-service-start" className="block space-y-1"><span>Ngày bắt đầu dịch vụ *</span>
          <Input id="kc01-service-start" type="date" value={termStart} onChange={e=>{
            setTermStart(e.target.value);
            if (!termEnd) setTermEnd(suggestTermEnd(e.target.value));
            setTermError('');
          }}/></label>
        <label htmlFor="kc01-service-end" className="block space-y-1"><span>Ngày kết thúc dịch vụ theo hợp đồng *</span>
          <Input id="kc01-service-end" type="date" value={termEnd} onChange={e=>{setTermEnd(e.target.value);setTermError('');}}/></label>
        <p className="text-xs text-muted-foreground">Gợi ý 12 tháng chỉ mang tính tham khảo; ngày trên hợp đồng ký là nguồn chính xác.</p>
        <label htmlFor="kc01-payment-cycle" className="block space-y-1"><span>Chu kỳ thanh toán *</span>
          <select id="kc01-payment-cycle" className="w-full rounded-lg border bg-background p-2" value={termCycle} onChange={e=>setTermCycle(e.target.value)}>
            <option value="YEARLY">Theo năm</option><option value="MONTHLY">Theo tháng</option>
          </select></label>
        {termError&&<p role="alert" className="text-sm text-destructive">{termError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={termSaving} onClick={()=>setTermFormOpen(false)}>Hủy</Button>
          <Button type="submit" disabled={termSaving}>{termSaving?'Đang lưu...':'Ghi nhận'}</Button>
        </div>
      </form>
    </AppDialog>
    <AppDialog open={Boolean(detail && entryMode)} onOpenChange={open=>{if(!open && !saving)setEntryMode(null);}}
      busy={saving} title={entryMode==='receipt'?'Thêm khoản thu từ nhà trường':'Thêm khoản chi hoa hồng'}
      description="Nhập đúng ngày, số tiền và ảnh chứng từ cho giao dịch.">
      {detail && entryMode && <form noValidate className="space-y-4" onChange={event=>{
        const name = event.target.getAttribute('name') as keyof FieldErrors | null;
        if (!name) return;
        setFieldErrors(current => {
          if (!current[name]) return current;
          const updated = { ...current };
          delete updated[name];
          return updated;
        });
      }} onSubmit={event=>void sendRecord(event)}>
        {entryMode==='receipt' ? <label className="block space-y-1"><span>Đợt thanh toán *</span>
          <select name="schedule_id" required className="w-full rounded-lg border bg-background p-2">
            {detail.schedules.filter(x=>x.amount_received<x.amount_due).map(x=><option key={x.id} value={x.id}>
              {channelDate(x.due_on)} · Còn {channelMoney(x.amount_due-x.amount_received)}</option>)}
          </select>{fieldErrors.schedule_id && <span role="alert" className="text-xs text-red-700">{fieldErrors.schedule_id}</span>}</label> : <label className="block space-y-1"><span>Phiếu chi đã duyệt *</span>
          <select name="payout_id" required className="w-full rounded-lg border bg-background p-2">
            {detail.payouts.filter(x=>x.status==='APPROVED').map(x=><option key={x.id} value={x.id}>{x.code} · {channelMoney(x.net_amount)}</option>)}
          </select>{fieldErrors.payout_id && <span role="alert" className="text-xs text-red-700">{fieldErrors.payout_id}</span>}</label>}
        <div className="space-y-1"><label htmlFor="accounting-transaction-date">Ngày giao dịch *</label>
          <Input id="accounting-transaction-date" type="date" name="transaction_date" required aria-invalid={Boolean(fieldErrors.transaction_date)} defaultValue={accountingBusinessDay(new Date())}/>{fieldErrors.transaction_date && <p role="alert" className="text-xs text-red-700">{fieldErrors.transaction_date}</p>}</div>
        <div className="space-y-1"><label htmlFor="accounting-amount">{entryMode==='receipt'?'Số tiền nhà trường thực trả (VNĐ) *':'Số tiền đã chuyển (VNĐ) *'}</label>
          <Input id="accounting-amount" name="amount" type="number" min={1} step={1} required
            aria-invalid={Boolean(fieldErrors.amount)} defaultValue={entryMode==='payout'?detail.payouts.find(x=>x.status==='APPROVED')?.net_amount:undefined}/>{fieldErrors.amount && <p role="alert" className="text-xs text-red-700">{fieldErrors.amount}</p>}</div>
        {entryMode==='payout' && <p className="text-xs text-muted-foreground">Số tiền chi phải khớp phiếu chi đã duyệt; chưa hỗ trợ chia nhỏ một phiếu chi.</p>}
        <div className="space-y-1"><label htmlFor="accounting-bank-reference">Mã giao dịch ngân hàng *</label>
          <Input id="accounting-bank-reference" name="reference_code" required maxLength={64} aria-invalid={Boolean(fieldErrors.reference_code)}/>{fieldErrors.reference_code && <p role="alert" className="text-xs text-red-700">{fieldErrors.reference_code}</p>}</div>
        <div className="space-y-1"><label htmlFor="accounting-bank-proof">Ảnh chứng từ chuyển khoản *</label>
          <Input id="accounting-bank-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required aria-invalid={Boolean(fieldErrors.proof)}/>
          {fieldErrors.proof && <p role="alert" className="text-xs text-red-700">{fieldErrors.proof}</p>}
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · tối đa 5 MB · lưu riêng tư theo phân quyền</p></div>
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
