'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const queryClient = useQueryClient();
  const [operations, setOperations] = useState<SchoolOperationsWorkspace | null>(null);
  const [management, setManagement] = useState<ChannelManagement | null>(null);
  const [report, setReport] = useState<SchoolOperationsReport | null>(null);
  const [period, setPeriod] = useState(currentBusinessPeriod);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [manualOpen, setManualOpen] = useState(false);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({name:'',email:'',password:'',organization_id:'',role_code:'CHANNEL_SALES'});
  const [manual, setManual] = useState<Record<string,string>>({unit_type:'MAIN'});
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
        setOperations(await api<SchoolOperationsWorkspace>('/school-operations?page=' + page + '&search=' + encodeURIComponent(search) + (section === 'admin-proposals' && statusFilter !== 'ALL' ? '&status=' + encodeURIComponent(statusFilter) : '')));
      }
      if (section === 'admin-team') setManagement(await api<ChannelManagement>('/management'));
      if (section === 'admin-reports') setReport(await api<SchoolOperationsReport>('/school-operations/report?period=' + period));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void reload(); }, [section, token, page, period, statusFilter]);
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
  const proposals = operations?.proposals.filter(p => (statusFilter==='ALL' || p.status===statusFilter) && [p.name,p.school_code,p.submitted_by].some(x => x.toLowerCase().includes(search.toLowerCase()))) ?? [];
  const createManual = async () => {
    setBusy(true); setError('');
    try {
      await api('/schools/manual',{method:'POST',body:JSON.stringify(manual)});
      setManual({unit_type:'MAIN'});setManualOpen(false);setNotice('Đã thêm trường thành công.');
      await queryClient.invalidateQueries();
      await onChanged();
    } catch(e) { setError(e instanceof Error ? e.message : 'Không lưu được trường.'); }
    finally { setBusy(false); }
  };
  const createTeamMember = async () => {
    setBusy(true);setError('');
    try {
      await api('/team',{method:'POST',body:JSON.stringify({...teamForm,organization_id:Number(teamForm.organization_id)})});
      setTeamFormOpen(false);setTeamForm({name:'',email:'',password:'',organization_id:'',role_code:'CHANNEL_SALES'});
      setNotice('Đã tạo tài khoản nhân sự.'); await reload();
    } catch(e) {setError(e instanceof Error?e.message:'Không tạo được tài khoản.');}
    finally {setBusy(false);}
  };
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
    {section === 'admin-schools' && <>
      <div className="flex justify-end"><Button disabled={preview} onClick={()=>setManualOpen(x=>!x)}>+ Thêm trường thủ công</Button></div>
      <Dialog open={manualOpen} onOpenChange={open => { if (!busy) setManualOpen(open); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Thêm trường học</DialogTitle><DialogDescription>Tạo trường chính hoặc phân hiệu thuộc trường chính đã có.</DialogDescription></DialogHeader><div className="space-y-3">
        <h3 className="mb-3 font-semibold">Tạo trường học</h3>
        <p className="mb-3 text-xs text-muted-foreground">Với phân hiệu, nhập mã trường chính đã có để liên kết.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Loại đơn vị<select className="mt-1 w-full rounded-lg border bg-background p-2" value={manual.unit_type||'MAIN'} onChange={e=>setManual(m=>({...m,unit_type:e.target.value}))}><option value="MAIN">Trường chính</option><option value="BRANCH">Phân hiệu</option></select></label>
          {(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email','school_phone','reason'] as const).map(k=><label className="text-sm" key={k}>{({school_code:'Mã trường chính',name:'Tên trường/phân hiệu',province:'Tỉnh/thành',ward:'Phường/xã',address:'Địa chỉ',contact_name:'Người liên hệ',contact_position:'Chức vụ',contact_phone:'SĐT liên hệ',email:'Email',school_phone:'SĐT trường',reason:'Lý do tạo'} as Record<string,string>)[k]}<Input className="mt-1" value={manual[k]||''} onChange={e=>setManual(m=>({...m,[k]:e.target.value}))}/></label>)}
        </div>
        <div className="mt-4 flex gap-2"><Button disabled={busy} onClick={()=>void createManual()}>Lưu trường</Button><Button variant="outline" onClick={()=>setManualOpen(false)}>Hủy</Button></div>
      </div></DialogContent></Dialog>
      <SchoolDirectory apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged} />
    </>}
    {section === 'admin-proposals' && <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Chờ Admin duyệt" value={operations ? pending : null} />
        <Summary label="Tổng đề xuất (trang hiện tại)" value={operations?.proposals.length ?? null} />
        <Summary label="Quá hạn" value={operations?.proposals.filter(x => x.is_overdue).length ?? null} />
      </div>
      <div className={panel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Danh sách đề xuất trường</h3><Button variant="outline" disabled={busy || preview} onClick={() => void reload()}><RefreshCw className="mr-2 size-4"/>Làm mới</Button></div>
        <div className="flex flex-wrap gap-2"><Input className="min-w-48 flex-1" aria-label="Tìm đề xuất" placeholder="Tìm tên trường hoặc mã trường…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/><select aria-label="Lọc trạng thái" className="rounded-lg border bg-background px-3" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}><option value="ALL">Tất cả trạng thái</option><option value="PENDING_MANAGER">Chờ Quản lý</option><option value="PENDING_ADMIN">Chờ Admin</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option></select><Button variant="outline" onClick={()=>{setSearch('');setStatusFilter('ALL');setPage(1);}}>Reset bộ lọc</Button></div>
        {busy && <p className="mt-3 text-sm text-muted-foreground">Đang tải dữ liệu…</p>}
        <div className="mt-4 space-y-3">
          {proposals.map(p => <div key={p.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{p.name}</strong><span className="rounded-full bg-muted px-3 py-1 text-xs">{workflowLabels[p.status] ?? p.status}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{p.school_code} · {p.province} · {p.ward}</p>
            <p className="mt-1 text-sm text-muted-foreground">Đề xuất: {p.submitted_by} · Quản lý: {p.manager_name} · Hạn: {workflowDate(p.review_due_at)}</p>
            {p.possible_duplicate && <p className="mt-2 text-sm text-amber-700">Cần kiểm tra trường trùng tên/khu vực.</p>}
            {p.status === 'PENDING_ADMIN' && can('channel_sales.school.directory.manage') && !preview && <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={()=>openEdit(p)}>Chỉnh đề xuất</Button><Button size="sm" variant="outline" onClick={()=>void showRevisions(p.id)}>Lịch sử sửa</Button></div>}
            {p.can_admin_review && !preview && <Button className="mt-3" size="sm" variant="outline" onClick={() => {setSelected(selected===p.id?null:p.id);setReason('');}}>Xem quyết định</Button>}

          </div>)}
          {!busy && proposals.length===0 && <p className="py-8 text-center text-sm text-muted-foreground">Không có đề xuất phù hợp.</p>}
        </div>
        {operations?.pagination && <div className="mt-4 flex items-center justify-end gap-3"><Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Trước</Button><span className="text-sm">Trang {page}</span><Button variant="outline" disabled={operations.proposals.length < operations.pagination.page_size} onClick={()=>setPage(p=>p+1)}>Sau</Button></div>}
      </div>
    </>}
    {section === 'admin-team' && <div className={panel}>
      <div className="mb-4 flex justify-between gap-3"><h3 className="font-semibold">Nhân sự & tổ chức</h3><Button disabled={preview || !can('channel_sales.team.manage')} onClick={()=>setTeamFormOpen(v=>!v)}>+ Thêm nhân sự</Button></div>
      <Dialog open={teamFormOpen} onOpenChange={open => { if (!busy) setTeamFormOpen(open); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Thêm nhân sự</DialogTitle><DialogDescription>Tạo tài khoản thuộc tổ chức được quản lý. Không cấp quyền Admin/BGĐ tại đây.</DialogDescription></DialogHeader><div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {(['name','email','password'] as const).map(k=><label className="text-sm" key={k}>{({name:'Họ và tên',email:'Email',password:'Mật khẩu ban đầu (tối thiểu 12 ký tự)'} as Record<string,string>)[k]}<Input className="mt-1" type={k==='password'?'password':'text'} value={teamForm[k]} onChange={e=>setTeamForm(t=>({...t,[k]:e.target.value}))}/></label>)}
          <label className="text-sm">Tổ chức<select className="mt-1 w-full rounded-lg border bg-background p-2" value={teamForm.organization_id} onChange={e=>setTeamForm(t=>({...t,organization_id:e.target.value}))}><option value="">Chọn tổ chức</option>{management?.organizations.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label>
          <label className="text-sm">Vai trò<select className="mt-1 w-full rounded-lg border bg-background p-2" value={teamForm.role_code} onChange={e=>setTeamForm(t=>({...t,role_code:e.target.value}))}>{management?.roles.filter(x=>!['ADMIN','BOARD'].includes(x.code)).map(x=><option key={x.code} value={x.code}>{x.name}</option>)}</select></label>
        </div>
        <div className="flex gap-2"><Button disabled={busy || !teamForm.organization_id || teamForm.password.length<12} onClick={()=>void createTeamMember()}>Tạo tài khoản</Button><Button variant="outline" onClick={()=>setTeamFormOpen(false)}>Hủy</Button></div>
      </div></DialogContent></Dialog>
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
    <Dialog open={revisions!==null} onOpenChange={open=>{if(!open)setRevisions(null);}}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Lịch sử chỉnh sửa đề xuất</DialogTitle><DialogDescription>Các lần cập nhật được lưu theo phiên bản, người sửa, thời gian và lý do.</DialogDescription></DialogHeader>
      <div className="space-y-3">{revisions?.map(r=><div className="rounded-lg border p-3 text-sm" key={r.version}><strong>Phiên bản {r.version}</strong><p className="mt-1 text-muted-foreground">{r.actor_name} · {workflowDate(r.created_at)}</p><p className="mt-2">{r.reason}</p></div>)}{revisions?.length===0 && <p className="text-sm text-muted-foreground">Chưa có lần chỉnh sửa nào.</p>}</div>
    </DialogContent></Dialog>
    <Dialog open={selected !== null} onOpenChange={open => {if(!open&&!busy)setSelected(null);}}><DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>Phê duyệt đề xuất trường</DialogTitle><DialogDescription>Kiểm tra thông tin và nhập căn cứ quyết định trước khi duyệt hoặc từ chối.</DialogDescription></DialogHeader>
      {(() => { const p=operations?.proposals.find(x=>x.id===selected); return p ? <div className="space-y-3">
        <p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{p.school_code} · {p.province} · {p.ward}</p>
        <p className="text-sm">Liên hệ: {p.contact_name || 'Chưa có'} · {p.contact_phone || 'Chưa có'}</p>
        {p.possible_duplicate && <p role="alert" className="text-sm text-amber-700">Có dấu hiệu trùng trường; vui lòng đối chiếu trước khi duyệt.</p>}
        <label className="block text-sm font-medium">Lý do / căn cứ quyết định<Input className="mt-1" value={reason} onChange={e=>setReason(e.target.value)}/></label>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>Hủy</Button><Button variant="outline" disabled={busy} onClick={()=>void updateProposal(p.id,false,false)}>Từ chối</Button><Button disabled={busy || !!p.possible_duplicate} onClick={()=>void updateProposal(p.id,true,false)}>Duyệt</Button></div>
      </div>:null; })()}
    </DialogContent></Dialog>
    <Dialog open={editing !== null} onOpenChange={open => { if (!open && !busy) setEditing(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Chỉnh sửa đề xuất trường</DialogTitle><DialogDescription>Lưu nội dung trước/sau và lý do chỉnh sửa. Chỉ áp dụng khi chờ Admin duyệt.</DialogDescription></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">{(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email'] as const).map(k=><label key={k} className="text-xs font-medium">{({school_code:'Mã trường',name:'Tên trường',province:'Tỉnh/thành',ward:'Phường/xã',address:'Địa chỉ',contact_name:'Người liên hệ',contact_position:'Chức vụ',contact_phone:'Số điện thoại',email:'Email'} as Record<string,string>)[k]}<Input className="mt-1" value={editFields[k]??''} onChange={e=>setEditFields(o=>({...o,[k]:e.target.value}))}/></label>)}</div>
      <label className="text-sm font-medium">Lý do chỉnh sửa<Input className="mt-1" value={reason} onChange={e=>setReason(e.target.value)}/></label>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setEditing(null)}>Hủy</Button><Button disabled={busy} onClick={()=>{const p=operations?.proposals.find(x=>x.id===editing);if(p)void saveEdit(p);}}>Lưu thay đổi</Button></div>
    </DialogContent></Dialog>
  </div>;
}
function Summary({label,value}:{label:string;value:number|null}) { return <div className={panel}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value===null?'—':fmt(value)}</p></div>; }
