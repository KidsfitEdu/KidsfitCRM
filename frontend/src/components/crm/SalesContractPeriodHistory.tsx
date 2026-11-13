'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Eye, FileText, Files } from 'lucide-react';
import { channelMoney, channelRequest } from '@/lib/channel-operations';
import { AppStatusBadge } from '@/components/common/app-status-badge';
import { appNotice } from '@/components/common/app-toast-provider';
import { Button } from '@/components/ui/button';

export type ContractPeriod = {
  type: 'ORIGINAL' | 'RENEWAL';
  id: number;
  contract_id: number;
  contract_code: string;
  renewal_no: number | null;
  signed_on: string | null;
  service_start_on: string | null;
  service_end_on: string | null;
  payment_cycle: string | null;
  service_plan: string | null;
  total_value: number;
  status: string;
  service_confirmed: boolean;
  evidence: { id: number; file_name: string; mime_type: string } | null;
};
const statusLabels: Record<string, string> = {
  ACTIVE: 'Đã xác minh', CONFIRMED: 'Đã xác nhận',
  PENDING_ACCOUNTING: 'Chờ Kế toán', NEEDS_INFO: 'Cần bổ sung',
  REJECTED: 'Đã từ chối', PENDING_REVIEW: 'Chờ Quản lý',
};
const date = (value: string | null) => value
  ? new Date(value.slice(0, 10) + 'T00:00:00+07:00').toLocaleDateString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'})
  : 'Chưa cập nhật';

export function SalesContractPeriodHistory({customerId, apiBase, token}:{
  customerId: number; apiBase: string; token: string;
}) {
  const [periods, setPeriods] = useState<ContractPeriod[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fileBusy, setFileBusy] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setPeriods([]); setExpanded(null); setError(''); setLoading(true);
    void channelRequest<{data: ContractPeriod[]}>(apiBase,token,
      '/protection-overview/' + customerId + '/contracts')
      .then(result => {
        if (!active) return;
        setPeriods(result.data);
        if (result.data.length > 0) setExpanded(result.data[0].type + '-' + result.data[0].id);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử hợp đồng.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [apiBase,token,customerId]);

  async function accessFile(item: NonNullable<ContractPeriod['evidence']>, mode: 'view' | 'download') {
    // Reserve the tab in the user's click event, before awaiting authenticated bytes.
    const tab = mode === 'view' ? window.open('', '_blank') : null;
    if (mode === 'view' && !tab) {
      appNotice.error('Không mở được tab xem hợp đồng.', 'Trình duyệt đang chặn cửa sổ mới. Vui lòng cho phép popup rồi thử lại.');
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.document.title = 'Đang mở hợp đồng...';
    }
    setFileBusy(item.id);
    try {
      const response = await fetch(apiBase + '/channel-sales/evidence/' + item.id, {
        headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
      });
      if (!response.ok) throw new Error('Không có quyền truy cập hoặc tệp không còn tồn tại.');
      const data = await response.blob();
      // Endpoint returns octet-stream; use database-verified metadata for native PDF/image rendering.
      const blob = new Blob([data], {type: item.mime_type});
      const url = URL.createObjectURL(blob);
      if (mode === 'view') {
        if (!tab || tab.closed) {
          URL.revokeObjectURL(url);
          throw new Error('Tab xem hợp đồng đã đóng. Vui lòng thử lại.');
        }
        tab.location.replace(url);
        // Keep the blob alive for the new tab; revoke when the originating CRM page unloads.
        window.addEventListener('pagehide', () => URL.revokeObjectURL(url), {once:true});
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = item.file_name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      }
    } catch (reason) {
      if (tab && !tab.closed) tab.close();
      appNotice.error(mode === 'view' ? 'Không xem được hợp đồng.' : 'Không tải được hợp đồng.',
        reason instanceof Error ? reason.message : 'Vui lòng thử lại.');
    } finally { setFileBusy(null); }
  }

  return <>
    <section aria-labelledby="sales-contract-period-heading" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 id="sales-contract-period-heading" className="flex items-center gap-2 font-bold text-foreground">
        <Files aria-hidden="true" className="size-4 text-primary"/>Hợp đồng & lịch sử tái ký
        {!loading && !error && <span className="ml-auto text-xs font-normal text-muted-foreground">{periods.length} hồ sơ</span>}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Mở từng kỳ để xem thời hạn, giá trị và file hợp đồng.</p>
      {loading && <output className="mt-4 block text-sm text-muted-foreground">Đang tải lịch sử hợp đồng...</output>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      {!loading && !error && periods.length === 0 &&
        <p className="mt-4 text-sm text-muted-foreground">Chưa có kỳ hợp đồng trong phạm vi tài khoản.</p>}
      <div className="mt-4 space-y-2">
        {periods.map(period => {
          const key = period.type + '-' + period.id;
          const isOpen = expanded === key;
          return <div key={key} className="overflow-hidden rounded-xl border border-border">
            <button type="button" aria-expanded={isOpen} aria-controls={'period-'+key}
              onClick={() => setExpanded(isOpen ? null : key)}
              className="flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <FileText aria-hidden="true" className="size-5 shrink-0 text-primary"/>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{period.type === 'ORIGINAL' ? 'Hợp đồng gốc' : 'Tái ký lần '+period.renewal_no}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{date(period.service_start_on)} – {date(period.service_end_on)}</span>
              </span>
              <AppStatusBadge status={period.status} label={statusLabels[period.status] ?? period.status}/>
              {isOpen ? <ChevronUp className="size-4 shrink-0 text-muted-foreground"/> :
                <ChevronDown className="size-4 shrink-0 text-muted-foreground"/>}
            </button>
            {isOpen && <div id={'period-'+key} className="space-y-3 border-t border-border px-3 py-4 text-sm">
              <p className="break-all text-xs text-muted-foreground">Mã hợp đồng: {period.contract_code}</p>
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-xs text-muted-foreground">Ngày ký</dt><dd className="mt-1 font-medium">{date(period.signed_on)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Thanh toán</dt><dd className="mt-1 font-medium">{period.payment_cycle === 'MONTHLY' ? 'Theo tháng' : period.payment_cycle === 'YEARLY' ? 'Theo năm' : 'Chưa cập nhật'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Bắt đầu dịch vụ</dt><dd className="mt-1 font-medium">{date(period.service_start_on)}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Kết thúc dịch vụ</dt><dd className="mt-1 font-medium">{date(period.service_end_on)}</dd></div>
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-muted-foreground">Giá trị hợp đồng</span>
                <strong className="tabular-nums">{channelMoney(period.total_value)}</strong>
              </div>
              {!period.service_confirmed && <p className="text-xs text-amber-700 dark:text-amber-300">Kỳ tái ký chưa được Kế toán xác nhận; chưa tính là kỳ dịch vụ đã xác nhận.</p>}
              {period.evidence ? <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
                <FileText className="size-5 shrink-0 text-primary" aria-hidden="true"/>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={period.evidence.file_name}>{period.evidence.file_name}</p>
                  <p className="text-xs text-muted-foreground">Hợp đồng đã đính kèm</p>
                </div>
                <Button type="button" size="icon" variant="ghost" title="Xem file" aria-label={'Xem file '+period.evidence.file_name}
                  disabled={fileBusy !== null} onClick={() => void accessFile(period.evidence!, 'view')}>
                  <Eye className="size-4"/>
                </Button>
                <Button type="button" size="icon" variant="ghost" title="Tải xuống" aria-label={'Tải xuống '+period.evidence.file_name}
                  disabled={fileBusy !== null} onClick={() => void accessFile(period.evidence!, 'download')}>
                  <Download className="size-4"/>
                </Button>
              </div> : <p className="text-xs text-muted-foreground">Chưa có file hợp đồng đính kèm.</p>}
            </div>}
          </div>;
        })}
      </div>
    </section>
  </>;
}
