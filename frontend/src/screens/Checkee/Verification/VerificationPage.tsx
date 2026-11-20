'use client';

import { getServicePlanLabel } from '@/lib/contract-payment-plan';
import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, CalendarDays, ClipboardList, Eye, ExternalLink, FileText, History, MessageSquareWarning, School } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import {
  AdminListPanel, AdminListToolbar, AdminIconAction,
  adminTableClass, adminTableHeadClass, adminTableCellClass,
} from '@/components/common/admin-list-ui';
import { AppPagination } from '@/components/common/app-pagination';
import { AppSelect } from '@/components/common/app-select';
import { AppStatusBadge } from '@/components/common/app-status-badge';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { channelRequest, channelDate, channelMoney } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

type VerificationStatus = 'ALL' | 'PENDING' | 'DISPUTED' | 'CONFIRMED';
type VerificationRow = {
  id: number; contract_id: number; school_name: string; sales_name: string; contract_code: string;
  signed_on: string; received_at: string | null; status: string;
  can_verify: boolean; can_feedback: boolean;
};
export type VerificationSummary = { pending: number; feedback: number; confirmed: number };
export type VerificationResponse = {
  data: VerificationRow[]; total: number; page: number; page_size: number; summary: VerificationSummary;
};
type Detail = {
  data: {
    id: number; contract_id: number; contract_code: string; school_name: string;
    school_address: string | null; school_province: string | null; sales_name: string;
    signed_on: string; total_value: number; service_plan: string | null; student_count: number | null;
    service_start_on: string | null; service_end_on: string | null; payment_cycle: string | null;
    evidence_reference: string | null; contract_status: string; reconciliation_status: string;
    dispute_reason: string | null; can_verify: boolean; can_feedback: boolean;
  };
  evidence: { id: number; file_name: string; mime_type: string; created_at: string }[];
  installments: { due_on: string; amount: number; status: string }[];
  history: { event_type: string; reason: string | null; created_at: string; actor_name: string }[];
};
export const verificationStatusLabels: Record<string, string> = {
  PENDING: 'Chờ xác minh', DISPUTED: 'Đã phản hồi / Cần bổ sung',
  CONFIRMED: 'Đã xác minh', RESOLVED: 'Đã hoàn tất',
};
const eventLabels: Record<string, string> = {
  OPENED: 'Sales gửi hợp đồng',
  MANAGER_FORWARDED: 'Quản lý chuyển CHECKEE',
  MANAGER_REVISION: 'Quản lý yêu cầu bổ sung',
  SALES_RESUBMITTED: 'Sales bổ sung hợp đồng',
  CONFIRMED: 'CHECKEE xác minh hợp lệ',
  DISPUTED: 'CHECKEE phản hồi hồ sơ',
  RESOLVED: 'Đã hoàn tất',
};
const canVerify = (abilities: string[]) => abilities.includes('*') || abilities.includes('channel_sales.reconcile');

export function VerificationPage({apiBase, token, abilities, onChanged}: RolePageProps) {
  const authorized = !apiBase || canVerify(abilities);
  const connected = !!apiBase && !!token && authorized;
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailError, setDetailError] = useState('');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [feedbackId, setFeedbackId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({page:String(page), page_size:String(pageSize), status});
      if (search) params.set('search', search);
      const response = await channelRequest<VerificationResponse>(apiBase, token, '/checkee/verifications?' + params);
      setRows(response.data); setTotal(response.total); setSummary(response.summary);
    } catch (cause) {
      setRows([]); setTotal(0);
      setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách hợp đồng.');
    } finally { setLoading(false); }
  }, [apiBase, token, connected, page, pageSize, search, status]);
  useEffect(() => { void load(); }, [load, reload]);

  useEffect(() => {
    if (!connected || selected === null) { setDetail(null); return; }
    let active = true;
    setDetail(null); setDetailError('');
    void channelRequest<Detail>(apiBase, token, '/checkee/verifications/' + selected)
      .then(value => { if (active) setDetail(value); })
      .catch(cause => { if (active) setDetailError(cause instanceof Error ? cause.message : 'Không thể tải hồ sơ.'); });
    return () => { active = false; };
  }, [apiBase, token, connected, selected, reload]);

  const refresh = async () => {
    setReload(value => value + 1);
    await onChanged();
  };
  const command = async (id: number, kind: 'confirm' | 'dispute', body: { reason: string }) => {
    if (busy || !connected) return;
    setBusy(true); setActionError('');
    try {
      await channelRequest(apiBase, token, '/reconciliation-cases/' + id + '/' + kind,
        {method: 'POST', body: JSON.stringify(body)});
      setConfirmId(null); setFeedbackId(null); setReason('');
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thể ghi nhận kết quả xác minh.');
    } finally { setBusy(false); }
  };
  const viewFile = async (file: Detail['evidence'][number]) => {
    const tab = window.open('', '_blank');
    if (tab) tab.document.title = 'Đang mở hợp đồng...';
    try {
      const response = await fetch(apiBase + '/channel-sales/evidence/' + file.id,
        {headers: {Authorization: 'Bearer ' + token}, cache:'no-store'});
      if (!response.ok) throw new Error('Không có quyền xem file hoặc file không tồn tại.');
      const bytes = await response.blob();
      const url = URL.createObjectURL(new Blob([bytes], {type:file.mime_type}));
      if (!tab) { URL.revokeObjectURL(url); throw new Error('Trình duyệt đang chặn tab mới.'); }
      tab.location.replace(url);
      window.addEventListener('pagehide', () => URL.revokeObjectURL(url), {once:true});
    } catch (cause) {
      tab?.close();
      setActionError(cause instanceof Error ? cause.message : 'Không thể mở file.');
    }
  };
  const openConfirm = (id:number) => {setActionError('');setConfirmId(id);};
  const openFeedback = (id:number) => {setActionError('');setReason('');setFeedbackId(id);};
  const reset = () => {setSearchDraft('');setSearch('');setStatus('ALL');setPage(1);};

  if (!authorized) return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">
    Không có quyền xác minh hợp đồng CHECKEE.
  </p>;

  return <div className="space-y-5">
    <AppPageHeader eyebrow="CHECKEE / KIDSFIT CRM" title="Xác minh hợp đồng"
      description="Tiếp nhận hợp đồng đã được Quản lý chuyển, xem tài liệu và xác minh kết quả."/>
    {!connected && <p className="rounded-xl border p-4 text-sm text-muted-foreground">
      Chế độ xem thử chỉ đọc. Kết nối Backend để xem và xác minh hợp đồng.
    </p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 p-3 text-sm text-red-700">{error}</p>}
    <AdminListPanel>
      <AdminListToolbar search={searchDraft} onSearchChange={setSearchDraft}
        onSearch={() => {setSearch(searchDraft.trim());setPage(1);}} onReset={reset}
        searchLabel="Tìm hợp đồng CHECKEE" placeholder="Tên trường, mã hợp đồng, Sales..."
        filters={<AppSelect ariaLabel="Lọc trạng thái xác minh" value={status} className="w-full sm:w-52"
          options={[{value:'ALL',label:'Tất cả trạng thái'},{value:'PENDING',label:'Chờ xác minh'},
            {value:'DISPUTED',label:'Đã phản hồi / Cần bổ sung'},{value:'CONFIRMED',label:'Đã xác minh'}]}
          onValueChange={next=>{setStatus(next as VerificationStatus);setPage(1);}}/>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr>
            <th scope="col" className={adminTableCellClass}>Trường học</th>
            <th scope="col" className={adminTableCellClass}>SALES</th>
            <th scope="col" className={adminTableCellClass}>Mã hợp đồng</th>
            <th scope="col" className={adminTableCellClass}>Ngày tiếp nhận</th>
            <th scope="col" className={adminTableCellClass}>Trạng thái</th>
            <th scope="col" className={adminTableCellClass + ' text-center'}>Thao tác</th>
          </tr></thead>
          <tbody className="divide-y divide-border/70">
            {rows.map(row => <tr key={row.id} className="even:bg-muted/20 hover:bg-muted/40">
              <td className={adminTableCellClass}><span className="font-semibold">{row.school_name}</span></td>
              <td className={adminTableCellClass}>{row.sales_name}</td>
              <td className={adminTableCellClass}>{row.contract_code}</td>
              <td className={adminTableCellClass}>{channelDate(row.received_at)}</td>
              <td className={adminTableCellClass}><AppStatusBadge status={row.status}
                tone={row.status==='CONFIRMED'?'success':row.status==='DISPUTED'?'danger':'warning'}
                label={verificationStatusLabels[row.status] ?? row.status}
                size="sm" className="max-w-none whitespace-nowrap [&>span]:whitespace-nowrap"/></td>
              <td className={adminTableCellClass}>
                <div className="flex items-center justify-center gap-2">
                  <AdminIconAction icon={Eye} label={'Xem hợp đồng ' + row.contract_code}
                    onClick={() => {setActionError('');setSelected(row.id);}}/>
                  {connected && row.can_verify && <AdminIconAction icon={BadgeCheck} tone="green"
                    label={'Xác minh hợp lệ ' + row.contract_code} onClick={() => openConfirm(row.id)}/>}
                  {connected && row.can_feedback && <AdminIconAction icon={MessageSquareWarning} tone="amber"
                    label={'Yêu cầu bổ sung ' + row.contract_code} onClick={() => openFeedback(row.id)}/>}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!loading && !error && !rows.length && <p className="px-5 py-12 text-center text-sm text-muted-foreground">
        Chưa có hồ sơ phù hợp trong phạm vi CHECKEE.
      </p>}
      {loading && <p className="px-5 py-6 text-center text-sm text-muted-foreground">Đang tải dữ liệu...</p>}
      <AppPagination page={page} pageSize={pageSize} total={total} disabled={loading || !connected}
        showSummary={false} pageSizeOptions={[20,50,100]} onPageChange={setPage}
        onPageSizeChange={size => {setPageSize(size);setPage(1);}}/>
    </AdminListPanel>
    <AppDrawer open={selected !== null}
      onOpenChange={open => {if(!open){setSelected(null);setActionError('');}}}
      title="Chi tiết hợp đồng" description="Hồ sơ CHECKEE và lịch sử xác minh"
      bodyClassName="space-y-4 bg-muted/10"
      footer={<div className="flex w-full flex-wrap items-center justify-end gap-2">
        <AppButton tone="neutral" onClick={() => setSelected(null)}>Đóng</AppButton>
        {connected && detail?.data.can_feedback && <AppButton tone="outline"
          onClick={() => openFeedback(detail.data.id)}>Yêu cầu bổ sung</AppButton>}
        {connected && detail?.data.can_verify && <AppButton
          onClick={() => openConfirm(detail.data.id)}>Xác minh hợp lệ</AppButton>}
      </div>}>
      {!detail ? <p role={detailError?'alert':'status'} className="text-sm text-muted-foreground">{detailError || 'Đang tải hồ sơ...'}</p>
        : <div className="space-y-4 text-sm">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex min-w-0 items-start gap-3">
              <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <School className="size-7"/>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="break-words text-lg font-bold leading-tight">{detail.data.school_name}</h3>
                <p className="break-all text-xs font-medium text-muted-foreground">{detail.data.contract_code}</p>
                <AppStatusBadge label={verificationStatusLabels[detail.data.reconciliation_status] ?? detail.data.reconciliation_status}
                  status={detail.data.reconciliation_status}
                  tone={detail.data.reconciliation_status==='CONFIRMED'?'success':detail.data.reconciliation_status==='DISPUTED'?'danger':'warning'}/>
              </div>
            </div>
            <dl className="space-y-3 border-t border-border pt-3">
              <div className="min-w-0 space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Địa chỉ trường</dt>
                <dd className="break-words font-medium">{[detail.data.school_address,detail.data.school_province].filter(Boolean).join(', ')||'Chưa cập nhật'}</dd>
              </div>
              <div className="min-w-0 space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">Sales phụ trách</dt>
                <dd className="break-words font-medium">{detail.data.sales_name}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <ClipboardList aria-hidden="true" className="size-4 text-primary"/>Thông tin hợp đồng
            </h4>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              {[
                ['Ngày ký',channelDate(detail.data.signed_on)],
                ['Giá trị hợp đồng',channelMoney(detail.data.total_value)],
                ['Gói dịch vụ',getServicePlanLabel(detail.data.service_plan)],
                ['Ngày bắt đầu dịch vụ',detail.data.service_start_on?channelDate(detail.data.service_start_on):'Chưa khai báo'],
                ['Ngày kết thúc dịch vụ',detail.data.service_end_on?channelDate(detail.data.service_end_on):'Chưa khai báo'],
                ['Chu kỳ thanh toán',detail.data.payment_cycle==='YEARLY'?'Theo năm':detail.data.payment_cycle==='MONTHLY'?'Theo tháng':'Chưa khai báo'],
                ['Số học sinh',String(detail.data.student_count ?? 'Chưa khai báo')],
              ].map(([label,value]) => <div key={label} className="min-w-0 space-y-1">
                <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                <dd className="break-words text-sm font-semibold tabular-nums text-foreground">{value}</dd>
              </div>)}
            </dl>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <FileText aria-hidden="true" className="size-4 text-primary"/>File hợp đồng đã ký
            </h4>
            <div className="space-y-2">
              {detail.evidence.map(file => <button key={file.id} type="button"
                title="Mở hợp đồng trong tab mới" onClick={() => void viewFile(file)}
                className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
                  <span className="min-w-0 break-all">{file.file_name}</span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
              </button>)}
              {!detail.evidence.length && <p className="text-muted-foreground">
                Chưa có file hợp đồng đính kèm. {detail.data.evidence_reference ?? ''}
              </p>}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <CalendarDays aria-hidden="true" className="size-4 text-primary"/>Lịch thanh toán
            </h4>
            {detail.installments.length
              ? <div className="divide-y divide-border">
                  {detail.installments.map((part,index) => <div key={index} className="flex min-w-0 items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="text-muted-foreground">{channelDate(part.due_on)}</span>
                    <span className="shrink-0 text-right font-semibold tabular-nums">{channelMoney(part.amount)}</span>
                  </div>)}
                </div>
              : <p className="text-muted-foreground">Chưa có lịch thanh toán.</p>}
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h4 className="flex items-center gap-2 text-sm font-bold">
              <History aria-hidden="true" className="size-4 text-primary"/>Lịch sử xác minh
            </h4>
            {detail.history.length
              ? <ol className="space-y-3">
                  {detail.history.map((entry,index) => <li key={index} className="border-l-2 border-primary/30 pl-3">
                    <p className="font-semibold">{eventLabels[entry.event_type] ?? entry.event_type}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.actor_name} · {channelDate(entry.created_at)}</p>
                    {entry.reason && <p className="mt-1 whitespace-pre-wrap break-words">{entry.reason}</p>}
                  </li>)}
                </ol>
              : <p className="text-muted-foreground">Chưa có lịch sử xử lý.</p>}
          </section>
        </div>}
    </AppDrawer>
    <ConfirmDialog open={confirmId !== null} busy={busy}
      onOpenChange={open => {if(!open && !busy){setConfirmId(null);setActionError('');}}}
      title="Xác nhận xác minh hợp đồng" confirmLabel="Xác nhận xác minh"
      description={<>Xác nhận hợp đồng <strong>{rows.find(row => row.id === confirmId)?.contract_code ?? detail?.data.contract_code}</strong> hợp lệ?
        Hồ sơ sẽ chuyển sang KIDSFIT ghi nhận quyền bảo vệ. Đây không phải xác nhận thanh toán.</>}
      onConfirm={() => {if(confirmId !== null)void command(confirmId,'confirm',{reason:'CHECKEE đã kiểm tra và xác minh hợp đồng hợp lệ.'});}}>
      {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
    </ConfirmDialog>
    <AppDialog open={feedbackId !== null} busy={busy}
      onOpenChange={open => {if(!open && !busy){setFeedbackId(null);setReason('');setActionError('');}}}
      title="Yêu cầu bổ sung hồ sơ" description="Ghi rõ lý do và tài liệu cần chỉnh sửa."
      footer={<>
        <AppButton tone="neutral" disabled={busy} onClick={() => setFeedbackId(null)}>Hủy</AppButton>
        <AppButton busy={busy} disabled={!reason.trim()} onClick={() => {
          if(feedbackId !== null)void command(feedbackId,'dispute',{reason:reason.trim()});
        }}>Gửi phản hồi</AppButton>
      </>}>
      <label htmlFor="checkee-feedback" className="text-sm font-semibold">Lý do yêu cầu bổ sung *</label>
      <textarea id="checkee-feedback" value={reason} maxLength={2000} required
        onChange={event => setReason(event.target.value)} placeholder="Ví dụ: Thiếu trang ký và đóng dấu..."
        className="mt-2 min-h-28 w-full rounded-lg border bg-background p-3 text-sm"/>
      {actionError && <p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
    </AppDialog>
    {summary && <span className="sr-only" aria-live="polite">
      Chờ xác minh {summary.pending}. Đã phản hồi {summary.feedback}. Đã xác minh {summary.confirmed}.
    </span>}
  </div>;
}
