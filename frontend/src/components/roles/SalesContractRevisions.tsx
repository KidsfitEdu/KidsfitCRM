'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import { FileUp } from 'lucide-react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppCurrencyInput } from '@/components/common/inputs/app-currency-input';
import { appNotice } from '@/components/common/app-toast-provider';
import { channelRequest } from '@/lib/channel-operations';

type Revision = { id: number; contract_code: string; school_name: string; reason: string | null };
type ContractDetail = {
  data: {
    id: number; customer_id: number; status: string; can_resubmit: boolean;
    signed_on: string; service_plan: string | null; student_count: number | null;
    branch_count: number | null; contract_note: string | null;
    maintenance_fee: number | null; setup_fee: number;
    revision_reason: string | null;
  };
  school_units: { id: number; name: string }[];
  evidence: { id: number; file_name: string; created_at: string }[];
};
type Props = { apiBase: string; token: string; contractId: number; onClose: () => void; onChanged: () => Promise<void> };

/** Single correction dialog opened from the contract icon in My Schools. */
export function SalesContractRevisions({ apiBase, token, contractId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [unitOptions, setUnitOptions] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const result = await channelRequest<ContractDetail>(apiBase, token,
          `/school-contracts/${contractId}/review-detail`);
        if (result.data.status !== 'NEEDS_REVISION' || !result.data.can_resubmit)
          throw new Error('Hợp đồng không còn ở trạng thái cho phép chỉnh sửa.');
        if (!alive) return;
        setDetail(result);
        try {
          const units = await channelRequest<{ data: { id: number; name: string }[] }>(
            apiBase, token, `/contract-school-units/${result.data.customer_id}`);
          if (alive) setUnitOptions(units.data);
        } catch {
          if (alive) setUnitOptions(result.school_units);
        }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : 'Không tải được hồ sơ cần sửa.');
      }
    })();
    return () => { alive = false; };
  }, [apiBase, token, contractId]);

  return <AppDialog open={true} onOpenChange={open => { if (!open && !busy) onClose(); }}
    title="Chỉnh sửa hợp đồng" description="Cập nhật hồ sơ đã gửi và gửi lại Quản lý xác minh."
    busy={busy}>
    {!detail && !error && <p className="text-sm text-muted-foreground">Đang tải dữ liệu hợp đồng...</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {detail && <RevisionEditor apiBase={apiBase} token={token}
      revision={{ id: contractId, contract_code: '', school_name: '', reason: detail.data.revision_reason }}
      detail={detail} unitOptions={unitOptions}
      busy={busy} setBusy={setBusy} actionError={actionError} setActionError={setActionError}
      onClose={onClose}
      onDone={async () => {
        appNotice.success('Đã gửi lại hợp đồng cho Quản lý kiểm tra.');
        onClose();
        try { await onChanged(); } catch {
          appNotice.warning('Đã gửi hợp đồng nhưng chưa tải lại được danh sách.');
        }
      }} />}
  </AppDialog>;
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

  const numberText = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';
  const multiplier = plan === 'MONTHLY_9' ? 9 : 1;
  return <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
    <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <strong>Quản lý yêu cầu chỉnh sửa:</strong> {detail.data.revision_reason || revision.reason || 'Bổ sung hồ sơ hợp đồng.'}
    </p>
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-semibold">Ngày ký hợp đồng *</legend>
      <input type="date" required value={signedOn} onChange={e => setSignedOn(e.target.value)}
        className="block h-10 w-full rounded-xl border bg-background px-3 text-sm" />
    </fieldset>
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Hình thức thanh toán *</legend>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="revision_payment_plan" checked={plan === 'SCHOOL_YEAR'}
          onChange={() => setPlan('SCHOOL_YEAR')} />
        Gói năm học (9 tháng, tặng 3 tháng hè)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="revision_payment_plan" checked={plan === 'MONTHLY_9'}
          onChange={() => setPlan('MONTHLY_9')} />
        Gói hàng tháng (9 tháng)
      </label>
    </fieldset>
    <div className="grid gap-3 sm:grid-cols-2">
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold">Quy mô học sinh *</legend>
        <input type="number" required min={1} max={100000} value={students}
          onChange={e => setStudents(e.target.value)}
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm" />
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold">Số phân hiệu triển khai *</legend>
        <input type="number" required min={selectedUnits.length} max={100000} value={branches}
          onChange={e => setBranches(e.target.value)}
          className="h-10 w-full rounded-xl border bg-background px-3 text-sm" />
      </fieldset>
    </div>
    {unitOptions.length > 0 && <fieldset className="rounded-xl border p-3">
      <legend className="text-sm font-semibold">Chọn phân hiệu triển khai</legend>
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
    <div className="grid gap-3 sm:grid-cols-2">
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold">
          {plan === 'MONTHLY_9' ? 'Phí duy trì mỗi tháng (VNĐ) *' : 'Phí duy trì 9 tháng (VNĐ) *'}
        </legend>
        <AppCurrencyInput aria-label="Phí duy trì" value={maintenance}
          onValueChange={setMaintenance} placeholder="Ví dụ: 1.000.000" required />
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-semibold">Phí khởi tạo (VNĐ) *</legend>
        <AppCurrencyInput aria-label="Phí khởi tạo" value={setup}
          onValueChange={setSetup} placeholder="Ví dụ: 2.000.000" required />
      </fieldset>
    </div>
    <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
      <h3 className="font-semibold">Chi phí theo hợp đồng</h3>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>Phí duy trì (9 tháng)</span>
        <span className="tabular-nums">{validMoney ? numberText(Number(maintenance) * multiplier) : '—'}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>Phí khởi tạo (một lần)</span>
        <span className="tabular-nums">{validMoney ? numberText(Number(setup)) : '—'}</span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <strong>Tổng giá trị hợp đồng</strong>
        <strong className="text-lg tabular-nums text-emerald-700">
          {validMoney ? numberText(total) : '—'}
        </strong>
      </div>
    </div>
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-semibold">Ghi chú hợp đồng (không bắt buộc)</legend>
      <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={4000} rows={3}
        className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm"
        placeholder="Nhập thông tin cần xác minh thêm (nếu có)..." />
    </fieldset>
    {detail.evidence.length > 0 && <div className="rounded-xl border bg-muted/20 p-3 text-sm">
      <p className="font-semibold">File hợp đồng đã gửi</p>
      <p className="mt-1 break-all text-muted-foreground">
        {detail.evidence[0].file_name}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">File cũ và lịch sử chỉnh sửa sẽ được giữ lại.</p>
    </div>}
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-semibold">File hợp đồng đã chỉnh sửa *</legend>
      <input name="contract_file" type="file" accept=".pdf,image/jpeg,image/png,image/webp" required
        className="block w-full rounded-xl border bg-background p-2 text-sm" />
      <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · Tối đa 5 MB.</p>
    </fieldset>
    {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
    <div className="flex justify-end gap-2 pt-2">
      <AppButton type="button" tone="neutral" disabled={busy} onClick={onClose}>Hủy</AppButton>
      <AppButton type="submit" busy={busy} disabled={!validMoney}
        leadingIcon={<FileUp className="size-4" />}>Gửi lại Quản lý</AppButton>
    </div>
  </form>;
}
