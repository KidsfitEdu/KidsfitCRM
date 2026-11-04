'use client';

import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { AlertCircle, FileUp, SquarePen } from 'lucide-react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppCurrencyInput } from '@/components/common/inputs/app-currency-input';
import { appNotice } from '@/components/common/app-toast-provider';
import { channelRequest } from '@/lib/channel-operations';

type Revision = { id: number; contract_code: string; school_name: string; reason: string | null };
type RevisionList = { data: Revision[]; total: number };
type ContractDetail = {
  data: {
    id: number; customer_id: number; status: string; can_resubmit: boolean;
    signed_on: string; service_plan: string | null; student_count: number | null;
    branch_count: number | null; contract_note: string | null;
    maintenance_fee: number | null; setup_fee: number;
    revision_reason: string | null;
  };
  school_units: { id: number; name: string }[];
};
type Props = { apiBase: string; token: string; abilities: string[]; onChanged: () => Promise<void> };

/** Returned contracts can be corrected in place, without creating a second contract. */
export function SalesContractRevisions({ apiBase, token, abilities, onChanged }: Props) {
  const [rows, setRows] = useState<Revision[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Revision | null>(null);
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [unitOptions, setUnitOptions] = useState<{ id: number; name: string }[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const enabled = !!apiBase && !!token &&
    (abilities.includes('*') || abilities.includes('channel_sales.contract.report'));

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await channelRequest<RevisionList>(apiBase, token, '/school-contracts/my-revisions');
      setRows(response.data);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được hợp đồng cần chỉnh sửa.');
    }
  }, [apiBase, token, enabled]);

  useEffect(() => { void load(); }, [load, version]);

  const open = async (row: Revision) => {
    setSelected(row);
    setDetail(null);
    setUnitOptions([]);
    setActionError('');
    setLoadingDetail(true);
    try {
      const result = await channelRequest<ContractDetail>(apiBase, token,
        `/school-contracts/${row.id}/review-detail`);
      if (result.data.status !== 'NEEDS_REVISION' || !result.data.can_resubmit)
        throw new Error('Hợp đồng không còn ở trạng thái cho phép chỉnh sửa.');
      setDetail(result);
      try {
        const units = await channelRequest<{ data: { id: number; name: string }[] }>(
          apiBase, token, `/contract-school-units/${result.data.customer_id}`);
        setUnitOptions(units.data);
      } catch {
        setUnitOptions(result.school_units);
      }
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không tải được hồ sơ cần sửa.');
    } finally {
      setLoadingDetail(false);
    }
  };

  if (!enabled) return null;

  return <>
    {error && <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-700">{error}</p>}
    {rows.length > 0 && <section id="sales-contract-revisions"
      aria-label="Hợp đồng cần chỉnh sửa"
      className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
      <header className="flex items-center gap-2 border-b border-amber-200 p-4">
        <AlertCircle className="size-5 text-amber-700" aria-hidden="true" />
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">Hợp đồng cần chỉnh sửa ({rows.length})</h3>
      </header>
      <div className="divide-y divide-amber-200/60">
        {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{row.school_name} · {row.contract_code}</p>
            <p className="mt-1 text-xs text-muted-foreground">{row.reason ?? 'Quản lý yêu cầu chỉnh sửa hợp đồng.'}</p>
          </div>
          <AppButton type="button" tone="outline" leadingIcon={<SquarePen className="size-4" />}
            onClick={() => void open(row)}>Chỉnh sửa hợp đồng</AppButton>
        </div>)}
      </div>
    </section>}
    <AppDialog open={selected !== null} onOpenChange={isOpen => { if (!isOpen && !busy) { setSelected(null); setDetail(null); } }}
      title="Chỉnh sửa và gửi lại hợp đồng"
      description={selected ? `${selected.school_name} · ${selected.contract_code}` : ''}
      busy={busy}>
      {loadingDetail && <p className="text-sm text-muted-foreground">Đang tải thông tin hợp đồng...</p>}
      {actionError && !detail && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
      {detail && selected && <RevisionEditor key={selected.id} apiBase={apiBase} token={token}
        revision={selected} detail={detail} unitOptions={unitOptions}
        busy={busy} setBusy={setBusy} actionError={actionError} setActionError={setActionError}
        onClose={() => { setSelected(null); setDetail(null); }}
        onDone={async () => {
          setSelected(null); setDetail(null);
          setVersion(value => value + 1);
          appNotice.success('Đã gửi lại hợp đồng cho Quản lý kiểm tra.');
          try { await onChanged(); } catch {
            appNotice.warning('Đã gửi hợp đồng nhưng chưa tải lại được danh sách.');
          }
        }} />}
    </AppDialog>
  </>;
}

function RevisionEditor({
  apiBase, token, revision, detail, unitOptions, busy, setBusy, actionError, setActionError, onDone, onClose,
}: {
  apiBase: string; token: string; revision: Revision; detail: ContractDetail;
  unitOptions: { id: number; name: string }[];
  busy: boolean; setBusy: (busy: boolean) => void;
  actionError: string; setActionError: (error: string) => void;
  onDone: () => Promise<void>; onClose: () => void;
}) {
  const original = detail.data;
  const [plan, setPlan] = useState(original.service_plan === 'MONTHLY_9' ? 'MONTHLY_9' : 'SCHOOL_YEAR');
  const [maintenance, setMaintenance] = useState(
    original.maintenance_fee === null ? '' : String(original.maintenance_fee));
  const [setup, setSetup] = useState(String(original.setup_fee ?? 0));
  const [students, setStudents] = useState(String(original.student_count ?? ''));
  const [branches, setBranches] = useState(String(original.branch_count ?? detail.school_units.length));
  const [selectedUnits, setSelectedUnits] = useState<number[]>(detail.school_units.map(x => x.id));
  const [note, setNote] = useState(original.contract_note ?? '');
  const [signedOn, setSignedOn] = useState(original.signed_on.slice(0, 10));
  const total = Number(maintenance) * (plan === 'MONTHLY_9' ? 9 : 1) + Number(setup);
  const validMoney = maintenance !== '' && setup !== '' &&
    Number.isSafeInteger(Number(maintenance)) && Number(maintenance) >= 0 &&
    Number.isSafeInteger(Number(setup)) && Number(setup) >= 0 &&
    Number.isSafeInteger(total) && total > 0;

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const file = form.get('contract_file');
    if (!(file instanceof File) || file.size === 0) {
      setActionError('Vui lòng chọn file hợp đồng đã chỉnh sửa.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setActionError('File hợp đồng tối đa 5 MB.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setActionError('Chỉ chấp nhận PDF, JPG, PNG hoặc WEBP.');
      return;
    }
    if (!validMoney || !Number.isSafeInteger(Number(students)) || Number(students) <= 0 ||
      !Number.isSafeInteger(Number(branches)) || Number(branches) < selectedUnits.length) {
      setActionError('Vui lòng kiểm tra lại số tiền, số học sinh và số phân hiệu.');
      return;
    }
    setBusy(true);
    setActionError('');
    try {
      const upload = new FormData();
      upload.set('kind', 'CONTRACT');
      upload.set('file', file);
      const evidence = await channelRequest<{ data: { id: number } }>(
        apiBase, token, '/evidence', { method: 'POST', body: upload });
      await channelRequest(apiBase, token, `/school-contracts/${revision.id}/resubmit`, {
        method: 'POST',
        body: JSON.stringify({
          evidence_id: evidence.data.id,
          signed_on: signedOn,
          service_plan: plan,
          student_count: Number(students),
          branch_count: Number(branches),
          school_unit_ids: selectedUnits,
          maintenance_fee: Number(maintenance),
          setup_fee: Number(setup),
          contract_note: note,
        }),
      });
      await onDone();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thể gửi lại hợp đồng.');
    } finally {
      setBusy(false);
    }
  };

  return <form onSubmit={submit} className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
    <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <strong>Yêu cầu từ Quản lý:</strong> {detail.data.revision_reason || revision.reason || 'Bổ sung hồ sơ hợp đồng.'}
    </p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Ngày ký hợp đồng *
        <input type="date" required value={signedOn} onChange={e => setSignedOn(e.target.value)}
          className="block h-10 w-full rounded-lg border bg-background px-3" />
      </label>
      <label className="space-y-1 text-sm">Hình thức thanh toán *
        <select value={plan} onChange={e => setPlan(e.target.value as typeof plan)}
          className="block h-10 w-full rounded-lg border bg-background px-3">
          <option value="SCHOOL_YEAR">Gói năm học (9 tháng)</option>
          <option value="MONTHLY_9">Hàng tháng (9 tháng)</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">Phí duy trì (VNĐ) *
        <AppCurrencyInput aria-label="Phí duy trì" value={maintenance}
          onValueChange={setMaintenance} required />
      </label>
      <label className="space-y-1 text-sm">Phí khởi tạo (VNĐ) *
        <AppCurrencyInput aria-label="Phí khởi tạo" value={setup}
          onValueChange={setSetup} required />
      </label>
      <label className="space-y-1 text-sm">Quy mô học sinh *
        <input type="number" required min={1} max={100000} value={students}
          onChange={e => setStudents(e.target.value)}
          className="block h-10 w-full rounded-lg border bg-background px-3" />
      </label>
      <label className="space-y-1 text-sm">Số phân hiệu *
        <input type="number" required min={selectedUnits.length} max={100000} value={branches}
          onChange={e => setBranches(e.target.value)}
          className="block h-10 w-full rounded-lg border bg-background px-3" />
      </label>
    </div>
    {unitOptions.length > 0 && <fieldset className="rounded-lg border p-3">
      <legend className="text-sm font-semibold">Các phân hiệu triển khai</legend>
      <div className="space-y-2">{unitOptions.map(unit =>
        <label key={unit.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selectedUnits.includes(unit.id)}
            onChange={e => {
              const next = e.target.checked ? [...selectedUnits, unit.id] :
                selectedUnits.filter(id => id !== unit.id);
              setSelectedUnits(next);
              if (Number(branches) < next.length) setBranches(String(next.length));
            }} />
          {unit.name}
        </label>)}</div>
    </fieldset>}
    <label className="block space-y-1 text-sm">Ghi chú hợp đồng
      <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={4000}
        className="block min-h-20 w-full rounded-lg border bg-background p-3" />
    </label>
    <p className="rounded-lg border p-3 text-sm">
      Tổng giá trị hợp đồng: <strong>{validMoney ? total.toLocaleString('vi-VN') + ' VNĐ' : 'Chưa hợp lệ'}</strong>
    </p>
    <label className="block space-y-1 text-sm font-semibold">File hợp đồng chỉnh sửa *
      <input name="contract_file" type="file" accept=".pdf,image/jpeg,image/png,image/webp" required
        className="block w-full rounded-lg border bg-background p-3 font-normal" />
    </label>
    <p className="text-xs text-muted-foreground">File cũ và lịch sử duyệt vẫn được giữ. Tối đa 5 MB.</p>
    {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
    <div className="flex justify-end gap-2">
      <AppButton type="button" tone="neutral" disabled={busy} onClick={onClose}>Hủy</AppButton>
      <AppButton type="submit" busy={busy} disabled={!validMoney}
        leadingIcon={<FileUp className="size-4" />}>Gửi lại Quản lý</AppButton>
    </div>
  </form>;
}
