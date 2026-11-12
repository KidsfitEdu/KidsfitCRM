'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppPageHeader } from '@/components/common/app-page-header';
import { channelRequest, type FinanceWorkspace } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

const businessDay = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const nextBusinessDay = () => {
  const [year, month, day] = businessDay().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
};
type Draft = { organization_id: string; code: string; name: string; rate_percent: string;
  effective_from: string; effective_until: string; personnel_type: string };
const initialDraft = (): Draft => ({
  organization_id: '', code: '', name: 'Hoa hồng Sales KIDSFIT', rate_percent: '30',
  effective_from: nextBusinessDay(), effective_until: '', personnel_type: '',
});

export function BoardCommissionPoliciesPanel({ apiBase, token, abilities }: RolePageProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const canRead = abilities.includes('*') || abilities.includes('channel_sales.commission.view');
  const canManage = abilities.includes('*') || abilities.includes('channel_sales.policy.manage');
  const connected = Boolean(apiBase && token && canRead);
  const query = useQuery({
    queryKey: ['board', 'commission-policies', apiBase, token],
    queryFn: () => channelRequest<FinanceWorkspace>(apiBase, token, '/finance'),
    enabled: connected,
  });
  const data = query.data;
  const policies = (data?.policies ?? []).filter(p => filter === 'ALL' || p.status === filter);
  const selected = (data?.policies ?? []).find(p => p.id === selectedId);
  const organizations = (data?.organizations ?? []).filter(x => x.code !== 'CHECKEE');
  const orgName = (id: number) => organizations.find(o => o.id === id)?.name ?? `#${id}`;
  const currentOrg = organizations.find(o => String(o.id) === draft.organization_id);
  const onSave = async () => {
    setError('');
    const rate = Number(draft.rate_percent);
    if (!currentOrg) { setError('Vui lòng chọn tổ chức.'); return; }
    if (!draft.code.trim() || !draft.name.trim()) { setError('Vui lòng nhập mã và tên chính sách.'); return; }
    if (!Number.isFinite(rate) || rate <= 0 || rate > currentOrg.commission_rate_ceiling) {
      setError(`Tỷ lệ phải lớn hơn 0 và không vượt hạn mức ${currentOrg.commission_rate_ceiling}% của tổ chức.`);
      return;
    }
    if (draft.effective_from <= businessDay() || (draft.effective_until && draft.effective_until < draft.effective_from)) {
      setError('Ngày bắt đầu phải sau hôm nay và ngày kết thúc không được trước ngày bắt đầu.'); return;
    }
    setBusy(true);
    try {
      await channelRequest(apiBase, token, '/commission-policies', {
        method: 'POST', body: JSON.stringify({
          organization_id: Number(draft.organization_id), code: draft.code.trim(),
          name: draft.name.trim(), rate_percent: rate, effective_from: draft.effective_from,
          effective_until: draft.effective_until || null,
          personnel_type: draft.personnel_type || null,
        }),
      });
      setOpen(false); setDraft(initialDraft()); setMessage('Đã lưu bản nháp chính sách hoa hồng.');
      await query.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu bản nháp.'); }
    finally { setBusy(false); }
  };
  const cancelDraft = async () => {
    if (cancelId === null) return;
    setBusy(true); setError('');
    try {
      await channelRequest(apiBase, token, `/commission-policies/${cancelId}/cancel-draft`, { method: 'POST' });
      setCancelId(null); setMessage('Đã hủy bản nháp. Lịch sử chính sách được giữ nguyên.');
      await query.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể hủy bản nháp.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Chính sách hoa hồng Sales"
      description="Quản lý tỷ lệ và lịch sử phiên bản chính sách theo tổ chức."
      actions={canManage && <AppButton leadingIcon={<Plus className="size-4"/>} onClick={() => {
        setError(''); setDraft(initialDraft()); setOpen(true);
      }}>Thêm chính sách</AppButton>}/>
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-200">
      Chính sách mới được lưu ở trạng thái <strong>Bản nháp</strong>. Chưa tự động tính hoặc chi hoa hồng.
      Điều kiện tính, thời điểm phát sinh, khấu trừ và căn cứ phê duyệt cần được chốt trước khi kích hoạt.
      Các khoản thu cũ không được tự động tính bù.
    </div>
    {!connected && <p role="alert" className="rounded-xl border p-4 text-sm">Tài khoản chưa có quyền xem chính sách hoặc chưa kết nối API.</p>}
    {query.error && <p role="alert" className="text-sm text-red-700">Không tải được chính sách. Vui lòng thử lại.</p>}
    {message && <p role="status" className="text-sm text-green-800">{message}</p>}
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <h3 className="font-semibold">Phiên bản chính sách</h3>
        <label className="flex items-center gap-2 text-sm">Trạng thái
          <select aria-label="Lọc trạng thái chính sách hoa hồng" className="h-9 rounded-lg border bg-background px-3"
            value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">Tất cả</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="ACTIVE">Đang áp dụng</option>
            <option value="INACTIVE">Ngừng áp dụng</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-[#1b5e20] text-xs font-semibold uppercase text-white"><tr>
            <th className="px-4 py-3">Mã / Tên</th><th className="px-4 py-3">Tổ chức</th>
            <th className="px-4 py-3">Loại Sales</th><th className="px-4 py-3 text-right">Tỷ lệ</th>
            <th className="px-4 py-3">Hiệu lực</th><th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Thao tác</th>
          </tr></thead>
          <tbody className="divide-y">
            {policies.map(p => <tr key={p.id}>
              <td className="px-4 py-3"><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.code}</div></td>
              <td className="px-4 py-3">{p.organization_id ? orgName(p.organization_id) : 'Chung'}</td>
              <td className="px-4 py-3">{p.personnel_type || 'Tất cả Sales'}</td>
              <td className="px-4 py-3 text-right tabular-nums">{p.rate_percent}%</td>
              <td className="px-4 py-3">{p.effective_from}{p.effective_until ? ` – ${p.effective_until}` : ''}</td>
              <td className="px-4 py-3">{p.status === 'DRAFT' ? 'Bản nháp' : p.status === 'ACTIVE' ? 'Đang áp dụng' : 'Ngừng áp dụng'}</td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                <AppButton tone="neutral" size="sm" onClick={() => setSelectedId(p.id)}>Chi tiết</AppButton>
                {canManage && p.status === 'DRAFT' && <AppButton tone="danger" size="sm"
                  onClick={() => {setError('');setCancelId(p.id);}}>Hủy bản nháp</AppButton>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
        {connected && !query.isFetching && !policies.length && <p className="p-6 text-center text-sm text-muted-foreground">Chưa có phiên bản chính sách phù hợp.</p>}
      </div>
    </section>
    <AppDrawer open={selectedId !== null} onOpenChange={value => {if (!value) setSelectedId(null);}}
      title="Chi tiết chính sách hoa hồng">
      {selected && <dl className="grid grid-cols-2 gap-4 text-sm">
        {([
          ['Tên chính sách', selected.name], ['Mã phiên bản', selected.code],
          ['Tổ chức', selected.organization_id ? orgName(selected.organization_id) : 'Chung'],
          ['Nhóm Sales', selected.personnel_type || 'Tất cả'],
          ['Tỷ lệ', `${selected.rate_percent}%`], ['Ngày bắt đầu', selected.effective_from],
          ['Ngày kết thúc', selected.effective_until || 'Không xác định'],
          ['Trạng thái', selected.status === 'DRAFT' ? 'Bản nháp' : selected.status === 'ACTIVE' ? 'Đang áp dụng' : selected.status],
        ] as [string,string][]).map(([label,value])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
      </dl>}
    </AppDrawer>
    <ConfirmDialog open={cancelId !== null} onOpenChange={next => {if (!next && !busy) setCancelId(null);}}
      title="Hủy bản nháp hoa hồng" description="Bản nháp sẽ ngừng được sử dụng, lịch sử vẫn được lưu để kiểm tra."
      destructive confirmLabel="Hủy bản nháp" busy={busy} onConfirm={() => void cancelDraft()}/>
    <AppDialog open={open} onOpenChange={next => {if (!next) setOpen(false);}} busy={busy}
      title="Thêm chính sách hoa hồng" description="Lưu bản nháp trước khi có quyết định kích hoạt."
      footer={<><AppButton tone="neutral" disabled={busy} onClick={() => setOpen(false)}>Hủy</AppButton>
        <AppButton busy={busy} onClick={() => void onSave()}>Lưu bản nháp</AppButton></>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Tổ chức *
          <select className="mt-1 h-10 w-full rounded-lg border bg-background px-3" value={draft.organization_id}
            onChange={e=>setDraft(v=>({...v,organization_id:e.target.value}))}>
            <option value="">Chọn tổ chức</option>
            {organizations.map(o=><option value={o.id} key={o.id}>{o.name} · tối đa {o.commission_rate_ceiling}%</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">Loại nhân sự
          <select className="mt-1 h-10 w-full rounded-lg border bg-background px-3" value={draft.personnel_type}
            onChange={e=>setDraft(v=>({...v,personnel_type:e.target.value}))}>
            <option value="">Tất cả Sales</option>
            {(data?.personnel_types ?? []).map(type=><option value={type} key={type}>{type}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">Mã phiên bản *
          <input className="mt-1 h-10 w-full rounded-lg border bg-background px-3" maxLength={48}
            value={draft.code} onChange={e=>setDraft(v=>({...v,code:e.target.value}))} placeholder="VD: KF-SALES-2027-01"/>
        </label>
        <label className="space-y-1 text-sm font-medium">Tỷ lệ hoa hồng (%) *
          <input className="mt-1 h-10 w-full rounded-lg border bg-background px-3" type="number" min="0.0001" max={currentOrg?.commission_rate_ceiling ?? 100} step="0.01"
            value={draft.rate_percent} onChange={e=>setDraft(v=>({...v,rate_percent:e.target.value}))}/>
        </label>
        <label className="space-y-1 text-sm font-medium sm:col-span-2">Tên chính sách *
          <input className="mt-1 h-10 w-full rounded-lg border bg-background px-3" maxLength={190}
            value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/>
        </label>
        <label className="space-y-1 text-sm font-medium">Ngày bắt đầu *
          <input className="mt-1 h-10 w-full rounded-lg border bg-background px-3" type="date" min={nextBusinessDay()}
            value={draft.effective_from} onChange={e=>setDraft(v=>({...v,effective_from:e.target.value}))}/>
        </label>
        <label className="space-y-1 text-sm font-medium">Ngày kết thúc
          <input className="mt-1 h-10 w-full rounded-lg border bg-background px-3" type="date" min={draft.effective_from}
            value={draft.effective_until} onChange={e=>setDraft(v=>({...v,effective_until:e.target.value}))}/>
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </AppDialog>
  </div>;
}
