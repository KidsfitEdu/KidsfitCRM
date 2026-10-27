'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SchoolDirectory } from '@/components/crm/school-directory';
import { channelRequest, currentBusinessPeriod, type ChannelManagement } from '@/lib/channel-operations';
import { workflowDate, workflowLabels, type SchoolOperationsWorkspace, type SchoolOperationsReport } from '@/lib/school-operations';
import type { ChannelSalesWorkspace } from '@/lib/channel-sales';

export type AdminSection = 'dashboard' | 'admin-schools' | 'admin-proposals' | 'admin-team' | 'admin-settings' | 'admin-reports';
type Props = { section: AdminSection; apiBase: string; token: string; abilities: string[]; workspace: ChannelSalesWorkspace; onChanged: () => Promise<void> };
const panel = 'rounded-2xl border bg-card p-5 shadow-sm';
const fmt = (value: number) => value.toLocaleString('vi-VN');

export function AdminWorkspace(props: Props) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
  }));
  return <QueryClientProvider client={queryClient}><AdminWorkspaceContent {...props} /></QueryClientProvider>;
}

function AdminWorkspaceContent({ section, apiBase, token, abilities, workspace, onChanged }: Props) {
  const [operations, setOperations] = useState<SchoolOperationsWorkspace | null>(null);
  const [management, setManagement] = useState<ChannelManagement | null>(null);
  const [report, setReport] = useState<SchoolOperationsReport | null>(null);
  const [period, setPeriod] = useState(currentBusinessPeriod);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<string,string>>({});
  const [revisions, setRevisions] = useState<{version:number;reason:string;created_at:string;actor_name:string}[] | null>(null);
  const [notice, setNotice] = useState('');
  const can = (permission: string) => abilities.includes('*') || abilities.includes(permission);
  const preview = !apiBase;
  const api = <T,>(url: string, init?: RequestInit) => channelRequest<T>(apiBase, token, url, init);
  const reload = async () => {
    if (preview || !token) return;
    setBusy(true); setError('');
    try {
      if (section === 'admin-proposals' || section === 'admin-settings' || section === 'admin-reports' || section === 'dashboard') {
        setOperations(await api<SchoolOperationsWorkspace>('/school-operations?page=' + page + '&search=' + encodeURIComponent(search)));
      }
      if (section === 'admin-team') setManagement(await api<ChannelManagement>('/management'));
      if (section === 'admin-reports') setReport(await api<SchoolOperationsReport>('/school-operations/report?period=' + period));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void reload(); }, [section, token, page, period]);
  const updateProposal = async (id: number, approve: boolean, duplicateReviewed: boolean) => {
    if (!reason.trim()) { setError('Cần nhập căn cứ quyết định.'); return; }
    setBusy(true); setError('');
    try {
      await api('/school-proposals/' + id + '/admin-review', { method: 'POST', body: JSON.stringify({ approve, reason, duplicate_reviewed: duplicateReviewed }) });
      setSelected(null); setReason(''); setNotice('Đã lưu quyết định.'); await reload(); await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được quyết định.'); }
    finally { setBusy(false); }
  };
  const openEdit = (p: SchoolOperationsWorkspace['proposals'][number]) => {
    setEditing(p.id);
    setEditFields(Object.fromEntries(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email'].map(k => [k, String(p[k as keyof typeof p] ?? '')])));
    setReason('');
  };
  const saveEdit = async (p: SchoolOperationsWorkspace['proposals'][number]) => {
    if (!reason.trim()) { setError('Cần ghi lý do sửa đề xuất.'); return; }
    setBusy(true); setError('');
    try {
      await api('/school-proposals/' + p.id, { method:'PATCH', body: JSON.stringify({
        expected_version:p.version, school_code:editFields.school_code, name:editFields.name,
        province:editFields.province, ward:editFields.ward, address:editFields.address,
        contact_name:editFields.contact_name, contact_position:editFields.contact_position,
        contact_phone:editFields.contact_phone, email:editFields.email, reason,
      }) });
      setEditing(null); setReason(''); setNotice('Đã cập nhật đề xuất và lưu lịch sử.');
      await reload(); await onChanged();
    } catch(e) { setError(e instanceof Error ? e.message : 'Không lưu được đề xuất.'); }
    finally { setBusy(false); }
  };
  const showRevisions = async (id:number) => {
    if (preview) return;
    setBusy(true); setError('');
    try {
      const result = await api<{data:{version:number;reason:string;createdAt:string;actor_name:string}[]}>('/school-proposals/' + id + '/revisions');
      setRevisions(result.data);
    } catch(e) { setError(e instanceof Error ? e.message : 'Không xem được lịch sử.'); }
    finally { setBusy(false); }
  };
  const proposals = operations?.proposals.filter(p => [p.name,p.school_code,p.submitted_by].some(x => x.toLowerCase().includes(search.toLowerCase()))) ?? [];
  const pending = operations?.proposals.filter(p => p.status === 'PENDING_ADMIN').length ?? 0;
  const metrics = workspace.metrics;
  return <div className="space-y-5">
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="size-4" />{error}</div>}
    {preview && <div className="rounded-xl border bg-muted/50 p-3 text-sm text-muted-foreground">Chế độ xem thử: dữ liệu thống kê quản trị chưa được kết nối API. Không hiển thị số liệu giả.</div>}
    {section === 'dashboard' && <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {([
          ['Tổng khách hàng CRM', metrics.available + metrics.approaching + metrics.contracted],
          ['Chưa đăng ký', metrics.available],
          ['Đang tiếp cận', metrics.approaching],
          ['Đã ký hợp đồng', metrics.contracted],
          ['Sắp hết hạn tiếp cận', metrics.expiring_soon],
          ['Đề xuất chờ Admin', operations ? pending : null],
        ] as [string,number|null][]).map(([label,value]) => <div key={label} className={panel}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold">{preview || value === null ? '—' : fmt(value)}</p></div>)}
      </div>
      <div className={panel}><h3 className="font-semibold">Công việc cần xử lý</h3><p className="mt-2 text-sm text-muted-foreground">Hồ sơ đề xuất chờ duyệt: {preview || !operations ? '—' : fmt(pending)}. Mở mục Đề xuất trường để xử lý.</p></div>
    </>}
    {section === 'admin-schools' && <SchoolDirectory apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged} />}
    {section === 'admin-proposals' && <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Chờ Admin duyệt" value={operations ? pending : null} />
        <Summary label="Tổng đề xuất (trang hiện tại)" value={operations?.proposals.length ?? null} />
        <Summary label="Quá hạn" value={operations?.proposals.filter(x => x.is_overdue).length ?? null} />
      </div>
      <div className={panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Danh sách đề xuất trường</h3><Button variant="outline" disabled={busy || preview} onClick={() => void reload()}><RefreshCw className="mr-2 size-4"/>Làm mới</Button></div>
        <Input aria-label="Tìm đề xuất" placeholder="Tìm tên trường hoặc mã trường…" value={search} onChange={e => setSearch(e.target.value)} />
        {busy && <p className="mt-3 text-sm text-muted-foreground">Đang tải dữ liệu…</p>}
        <div className="mt-4 space-y-3">
          {proposals.map(p => <div key={p.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{p.name}</strong><span className="rounded-full bg-muted px-3 py-1 text-xs">{workflowLabels[p.status] ?? p.status}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{p.school_code} · {p.province} · {p.ward}</p>
            <p className="mt-1 text-sm text-muted-foreground">Đề xuất: {p.submitted_by} · Quản lý: {p.manager_name} · Hạn: {workflowDate(p.review_due_at)}</p>
            {p.possible_duplicate && <p className="mt-2 text-sm text-amber-700">Cần kiểm tra trường trùng tên/khu vực.</p>}
            {p.status === 'PENDING_ADMIN' && can('channel_sales.school.directory.manage') && !preview && <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={()=>openEdit(p)}>Chỉnh đề xuất</Button><Button size="sm" variant="outline" onClick={()=>void showRevisions(p.id)}>Lịch sử sửa</Button></div>}
            {editing === p.id && <div className="mt-3 space-y-3 rounded-xl border bg-muted/20 p-4">
              <h4 className="font-semibold">Chỉnh đề xuất trước khi duyệt</h4>
              <div className="grid gap-3 sm:grid-cols-2">{(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email'] as const).map(k=><label key={k} className="text-xs font-medium">{({school_code:'Mã trường',name:'Tên trường',province:'Tỉnh/thành',ward:'Phường/xã',address:'Địa chỉ',contact_name:'Người liên hệ',contact_position:'Chức vụ',contact_phone:'Số điện thoại',email:'Email'} as Record<string,string>)[k]}<Input className="mt-1" value={editFields[k]??''} onChange={e=>setEditFields(o=>({...o,[k]:e.target.value}))}/></label>)}</div>
              <label className="block text-sm">Lý do chỉnh sửa<Input value={reason} onChange={e=>setReason(e.target.value)}/></label>
              <div className="flex gap-2"><Button disabled={busy} onClick={()=>void saveEdit(p)}>Lưu thay đổi</Button><Button variant="outline" onClick={()=>setEditing(null)}>Đóng</Button></div>
            </div>}
            {p.can_admin_review && !preview && <Button className="mt-3" size="sm" variant="outline" onClick={() => {setSelected(selected===p.id?null:p.id);setReason('');}}>Xem quyết định</Button>}
            {selected===p.id && <div className="mt-3 space-y-3 border-t pt-3">
              <p className="text-sm">Thông tin liên hệ: {p.contact_name || 'Chưa có'} · {p.contact_phone || 'Chưa có'}</p>
              <label className="block text-sm font-medium">Lý do / căn cứ<input className="mt-1 w-full rounded-lg border bg-background p-2" value={reason} onChange={e=>setReason(e.target.value)} /></label>
              <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void updateProposal(p.id,true,false)}>Duyệt</Button><Button disabled={busy} variant="outline" onClick={()=>void updateProposal(p.id,false,false)}>Từ chối</Button></div>
              {p.possible_duplicate && <p className="text-xs text-muted-foreground">Hồ sơ trùng cần đối chiếu trước khi duyệt. Không tự vượt qua kiểm tra trùng.</p>}
            </div>}
          </div>)}
          {!busy && proposals.length===0 && <p className="py-8 text-center text-sm text-muted-foreground">Không có đề xuất phù hợp.</p>}
        </div>
        {revisions && <div className="mt-5 rounded-xl border p-4"><div className="flex justify-between"><strong>Lịch sử chỉnh sửa</strong><Button variant="outline" size="sm" onClick={()=>setRevisions(null)}>Đóng</Button></div>{revisions.map(r=><div className="border-b py-2 text-sm" key={r.version}>Lần {r.version} · {r.actor_name} · {workflowDate(r.created_at)} · {r.reason}</div>)}{!revisions.length && <p className="text-sm text-muted-foreground">Chưa có lịch sử chỉnh sửa.</p>}</div>}
        {operations?.pagination && <div className="mt-4 flex items-center justify-end gap-3"><Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Trước</Button><span className="text-sm">Trang {page}</span><Button variant="outline" disabled={operations.proposals.length < operations.pagination.page_size} onClick={()=>setPage(p=>p+1)}>Sau</Button></div>}
      </div>
    </>}
    {section === 'admin-team' && <div className={panel}>
      <h3 className="mb-4 font-semibold">Nhân sự & tổ chức</h3>
      {management ? <div className="space-y-3">{management.team.map(u=><div className="flex flex-wrap justify-between gap-2 border-b pb-3 text-sm" key={u.id}><div><strong>{u.name}</strong><p className="text-muted-foreground">{u.email} · {u.organization_name}</p></div><span>{u.membership_type} · {u.status}</span></div>)}{management.team.length===0 && <p>Chưa có nhân sự.</p>}</div>:<p className="text-sm text-muted-foreground">{busy?'Đang tải…':'Chưa có dữ liệu hoặc chưa đủ quyền.'}</p>}
    </div>}
    {section === 'admin-settings' && <div className={panel}>
      <h3 className="mb-2 font-semibold">Chính sách vận hành</h3><p className="mb-4 text-sm text-muted-foreground">Chỉ hiển thị phiên bản chính sách đã lưu. Chưa kích hoạt thông số SLA chưa được phê duyệt.</p>
      {operations?.policies.map(p=><div className="flex justify-between gap-3 border-b py-3 text-sm" key={p.id}><div><strong>Phiên bản {p.version}</strong><p className="text-muted-foreground">Quản lý: {p.manager_review_hours} giờ · Admin: {p.admin_review_hours} giờ</p></div><span>{workflowLabels[p.status] ?? p.status}</span></div>)}
      {!operations?.policies.length && <p className="text-sm text-muted-foreground">Chưa có chính sách được tải.</p>}
    </div>}
    {section === 'admin-reports' && <div className={panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Báo cáo vận hành</h3><Input className="max-w-44" type="month" aria-label="Kỳ báo cáo" value={period} onChange={e=>setPeriod(e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><Summary label="Trường chưa đăng ký" value={report?.available_schools ?? null}/><Summary label="Hợp đồng đang hiệu lực" value={report?.active_contracts ?? null}/><Summary label="Đề xuất quá hạn" value={report?.overdue_proposals ?? null}/><Summary label="Tiếp cận hết hạn" value={report?.expired_approaches ?? null}/></div>
      <p className="mt-4 text-sm text-muted-foreground">Lịch sử chỉnh sửa từng trường và đề xuất được kiểm soát theo quyền truy cập của hồ sơ tương ứng.</p>
    </div>}
  </div>;
}
function Summary({label,value}:{label:string;value:number|null}) { return <div className={panel}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value===null?'—':fmt(value)}</p></div>; }
