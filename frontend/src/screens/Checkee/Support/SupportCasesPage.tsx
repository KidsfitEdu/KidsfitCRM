'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Clock3, Wrench, CheckCircle2 } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AdminListPanel, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { AppStatCard } from '@/components/common/app-stat-card';
import { channelRequest, channelDate } from '@/lib/channel-operations';
import type { RolePageProps } from '@/types/role-pages';

type Case = {
  id: number; contract_id: number; subject: string; description: string; status: string; created_at: string;
  forwarded_at: string; checkee_responded_at: string | null; school_name: string; contract_code: string;
  activities: { id: number; content: string; occurred_at: string; author_name: string }[];
};
type Result = { data: Case[]; total: number; page: number; page_size: number;
  summary: { open: number; in_progress: number; resolved: number } };

export function SupportCasesPage({ apiBase, token, abilities, onChanged }: RolePageProps) {
  const allowed = !apiBase || abilities.includes('*') || abilities.includes('channel_sales.school.technical_support.handle');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Case | null>(null);
  const [content, setContent] = useState('');
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['checkee-technical-tickets', token, status, page],
    queryFn: () => channelRequest<Result>(apiBase, token,
      '/checkee/support-cases?page=' + page + '&page_size=20&status=' + status),
    enabled: !!apiBase && !!token && allowed,
  });
  const reply = async () => {
    if (!selected || !content.trim()) return;
    setBusy(true); setError('');
    try {
      await channelRequest(apiBase, token, '/checkee/support-cases/' + selected.id + '/progress',
        { method: 'POST', body: JSON.stringify({ content, completed }) });
      setSelected(null); setContent(''); setCompleted(false);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['checkee-technical-tickets'] }), onChanged()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu phản hồi kỹ thuật.');
    } finally { setBusy(false); }
  };
  if (!allowed) return <p role="alert">Không có quyền xử lý lỗi hệ thống.</p>;
  return <div className="space-y-5">
    <AppPageHeader eyebrow="CHECKEE / KIDSFIT CRM" title="Ticket lỗi hệ thống"
      description="Chỉ các lỗi hệ thống do CSKH chuyển. CHECKEE phản hồi kỹ thuật, CSKH xác nhận với trường và đóng ticket."/>
    {!apiBase && <p className="rounded-xl border p-4 text-sm text-muted-foreground">Bản xem thử chỉ đọc; kết nối Backend để xử lý ticket.</p>}
    {query.error && <p role="alert" className="rounded-xl border border-red-200 p-3 text-sm text-red-700">{query.error.message}</p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <AppStatCard icon={Clock3} label="Mới nhận" value={query.data?.summary.open ?? '—'}/>
      <AppStatCard icon={Wrench} label="Đang xử lý" value={query.data?.summary.in_progress ?? '—'}/>
      <AppStatCard icon={CheckCircle2} label="CSKH đã đóng" value={query.data?.summary.resolved ?? '—'}/>
    </div>
    <AdminListPanel>
      <div className="border-b p-4">
        <label className="inline-flex items-center gap-2 text-sm">Trạng thái
          <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}
            className="rounded-lg border bg-background px-3 py-2" aria-label="Lọc trạng thái">
            <option value="ALL">Tất cả</option><option value="OPEN">Mới nhận</option>
            <option value="IN_PROGRESS">Đang xử lý</option><option value="RESOLVED">Đã đóng</option>
          </select>
        </label>
      </div>
      {query.isLoading && <p className="p-5 text-sm text-muted-foreground">Đang tải ticket…</p>}
      {query.data?.data.length === 0 && <p className="p-5 text-sm text-muted-foreground">Không có ticket lỗi hệ thống.</p>}
      <div className="overflow-x-auto"><table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr>
          <th scope="col" className={adminTableCellClass}>Trường</th>
          <th scope="col" className={adminTableCellClass}>Vấn đề</th>
          <th scope="col" className={adminTableCellClass}>Trạng thái</th>
          <th scope="col" className={adminTableCellClass}>Ngày chuyển</th>
          <th scope="col" className={adminTableCellClass}>Thao tác</th>
        </tr></thead><tbody>
        {query.data?.data.map(x => <tr key={x.id} className="border-b">
          <td className={adminTableCellClass}><p className="font-semibold">{x.school_name}</p><p className="text-xs text-muted-foreground">{x.contract_code}</p></td>
          <td className={adminTableCellClass}>{x.subject}</td>
          <td className={adminTableCellClass}>{x.status === 'RESOLVED' ? 'CSKH đã đóng' : x.checkee_responded_at ? 'Kỹ thuật đã phản hồi' : x.status === 'OPEN' ? 'Mới nhận' : 'Đang xử lý'}</td>
          <td className={adminTableCellClass}>{channelDate(x.forwarded_at)}</td>
          <td className={adminTableCellClass}><AppButton tone="outline" onClick={() => { setSelected(x); setError(''); setContent(''); setCompleted(false); }}>Chi tiết / Phản hồi</AppButton></td>
        </tr>)}</tbody>
      </table></div>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t p-4 text-sm">
        <span>Trang {query.data?.page ?? page} · Tổng {query.data?.total ?? 0}</span>
        <AppButton tone="outline" disabled={page === 1} onClick={() => setPage(n => Math.max(1, n-1))}>Trước</AppButton>
        <AppButton tone="outline" disabled={!query.data || page * 20 >= query.data.total} onClick={() => setPage(n => n+1)}>Sau</AppButton>
      </div>
    </AdminListPanel>
    <AppDrawer open={selected !== null} onOpenChange={open => { if (!open && !busy) setSelected(null); }}
      title={selected?.subject ?? 'Chi tiết hỗ trợ'} description={selected?.school_name} busy={busy}
      footer={<>
        <AppButton tone="neutral" disabled={busy} onClick={() => setSelected(null)}>Đóng</AppButton>
        {selected?.status !== 'RESOLVED' && <AppButton busy={busy} disabled={!content.trim()} onClick={() => void reply()}>Gửi phản hồi</AppButton>}
      </>}>
      {selected && <div className="space-y-4 text-sm">
        <div><p className="font-semibold">{selected.school_name} · {selected.contract_code}</p><p className="mt-2 whitespace-pre-wrap">{selected.description}</p></div>
        <section className="space-y-2"><h3 className="font-semibold">Lịch sử kỹ thuật</h3>
          {!selected.activities.length && <p className="text-muted-foreground">Chưa có phản hồi.</p>}
          {selected.activities.map(a => <div key={a.id} className="rounded-xl border p-3">
            <p>{a.content}</p><p className="mt-1 text-xs text-muted-foreground">{a.author_name} · {channelDate(a.occurred_at)}</p>
          </div>)}
        </section>
        {selected.status !== 'RESOLVED' && <>
          <label className="block font-semibold" htmlFor="checkee-reply">Tiến độ / kết quả kỹ thuật</label>
          <textarea id="checkee-reply" rows={4} maxLength={4000} value={content} onChange={event => setContent(event.target.value)}
            className="w-full rounded-xl border bg-background p-3" placeholder="Mô tả lỗi, cách xử lý, kết quả kiểm tra…"/>
          <label className="flex items-start gap-2"><input type="checkbox" checked={completed} onChange={event => setCompleted(event.target.checked)}/>
            <span>Đã xử lý xong kỹ thuật, chuyển kết quả cho CSKH kiểm tra lại với trường.</span></label>
        </>}
        {error && <p role="alert" className="rounded-lg border border-red-200 p-3 text-red-700">{error}</p>}
      </div>}
    </AppDrawer>
  </div>;
}
