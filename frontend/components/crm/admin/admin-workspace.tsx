'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Plus, FileSpreadsheet, Eye, Pencil, History, Check } from 'lucide-react';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass } from './admin-list-ui';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/app-button';
import { AppStatCard } from '@/components/common/app-stat-card';
import { Building2, ClipboardList, CalendarClock, Handshake, TrendingUp, UsersRound } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SchoolDirectory } from '@/components/crm/school-directory';
import { AdminCapacityManagement } from './admin-capacity-management';
import { FormActions } from '@/components/common/form-actions';
import { FormError } from '@/components/common/form-error';
import { appNotice } from '@/components/common/app-toast-provider';
import { channelRequest, currentBusinessPeriod, type ChannelManagement } from '@/lib/channel-operations';
import { workflowDate, workflowLabels, type SchoolOperationsWorkspace, type SchoolOperationsReport } from '@/lib/school-operations';
import type { ChannelSalesWorkspace } from '@/lib/channel-sales';

export type AdminSection = 'dashboard' | 'admin-schools' | 'admin-proposals' | 'admin-team' | 'admin-capacity' | 'admin-policies' | 'admin-reports';
type Props = { section: AdminSection; apiBase: string; token: string; abilities: string[]; workspace: ChannelSalesWorkspace; onChanged: () => Promise<void> };
const panel = 'crm-brand-surface rounded-2xl border border-border/80 bg-card p-5';
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
  const [proposalDraft, setProposalDraft] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [manualOpen, setManualOpen] = useState(false);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamDraft, setTeamDraft] = useState('');
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(20);
  const [teamDetail, setTeamDetail] = useState<ChannelManagement['team'][number] | null>(null);
  const [teamStatus, setTeamStatus] = useState('ALL');
  const [teamForm, setTeamForm] = useState({name:'',email:'',password:'',organization_id:'',role_code:'CHANNEL_SALES'});
  const [manual, setManual] = useState<Record<string,string>>({unit_type:'MAIN'});
  const [page, setPage] = useState(1);
  const [proposalPageSize, setProposalPageSize] = useState(20);
  // The existing API returns 100 proposals per server page. 10/20/50 all divide 100,
  // so each displayed client page fits entirely inside one server page.
  const proposalServerPage = Math.floor(((page - 1) * proposalPageSize) / 100) + 1;
  const [policyDraft, setPolicyDraft] = useState('');
  const [policySearch, setPolicySearch] = useState('');
  const [policyStatus, setPolicyStatus] = useState('ALL');
  const [policyPage, setPolicyPage] = useState(1);
  const [policyPageSize, setPolicyPageSize] = useState(20);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string,string>>({});
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Record<string,string>>({});
  const [revisions, setRevisions] = useState<{version:number;reason:string;created_at:string;actor_name:string}[] | null>(null);

  const can = (permission: string) => abilities.includes('*') || abilities.includes(permission);
  const preview = !apiBase;
  const api = <T,>(url: string, init?: RequestInit) => channelRequest<T>(apiBase, token, url, init);
  const reload = async () => {
    if (preview || !token) return;
    setBusy(true); setError('');
    try {
      if (section === 'admin-proposals' || section === 'admin-policies' || section === 'admin-reports' || section === 'dashboard') {
        setOperations(await api<SchoolOperationsWorkspace>('/school-operations?page=' + (section === 'admin-proposals' ? proposalServerPage : page) + '&search=' + encodeURIComponent(search) + (section === 'admin-proposals' && statusFilter !== 'ALL' ? '&status=' + encodeURIComponent(statusFilter) : '')));
      }
      if (section === 'admin-team') setManagement(await api<ChannelManagement>('/management'));
      if (section === 'admin-reports') setReport(await api<SchoolOperationsReport>('/school-operations/report?period=' + period));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void reload(); }, [section, token, proposalServerPage, period, statusFilter, search]);
  const updateProposal = async (id: number, approve: boolean, duplicateReviewed: boolean) => {
    if (!reason.trim()) { setError('Cần nhập căn cứ quyết định.'); return; }
    setBusy(true); setError('');
    try {
      await api('/school-proposals/' + id + '/admin-review', { method: 'POST', body: JSON.stringify({ approve, reason, duplicate_reviewed: duplicateReviewed }) });
      setSelected(null); setReason(''); appNotice.success('Đã lưu quyết định đề xuất.'); await reload(); await onChanged();
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
      setEditing(null); setReason(''); appNotice.success('Đã cập nhật đề xuất và lưu lịch sử.');
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
  const proposalOffset = ((page - 1) * proposalPageSize) % 100;
  const proposals = operations?.pagination?.page === proposalServerPage
    ? operations.proposals.slice(proposalOffset, proposalOffset + proposalPageSize)
    : [];
  const filteredPolicies = (operations?.policies ?? []).filter(p =>
    (policyStatus === 'ALL' || p.status === policyStatus) &&
    (policySearch === '' || `Phiên bản ${p.version} ${workflowLabels[p.status] ?? p.status}`.toLocaleLowerCase('vi').includes(policySearch.toLocaleLowerCase('vi')))
  );
  const createManual = async () => {
    const errs: Record<string,string> = {};
    for(const key of ['school_code','name','province','ward','reason']) if(!manual[key]?.trim()) errs[key]='Trường này là bắt buộc.';
    if(manual.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manual.email.trim())) errs.email='Email không đúng định dạng.';
    if(manual.reason?.trim() && manual.reason.trim().length<3) errs.reason='Vui lòng nêu lý do ít nhất 3 ký tự.';
    setFormErrors(errs);
    if(Object.keys(errs).length) return;
    setBusy(true); setError('');
    try {
      await api('/schools/manual',{method:'POST',body:JSON.stringify(manual)});
      setManual({unit_type:'MAIN'});setManualOpen(false);appNotice.success('Đã thêm trường thành công.');
      await queryClient.invalidateQueries();
      await onChanged();
    } catch(e) { setError(e instanceof Error ? e.message : 'Không lưu được trường.'); }
    finally { setBusy(false); }
  };
  const createTeamMember = async () => {
    const errs: Record<string,string> = {};
    if(!teamForm.name.trim()) errs.name='Cần nhập họ tên.';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teamForm.email)) errs.email='Email không hợp lệ.';
    if(teamForm.password.length<12) errs.password='Mật khẩu cần ít nhất 12 ký tự.';
    if(!teamForm.organization_id) errs.organization_id='Vui lòng chọn tổ chức.';
    setFormErrors(errs);
    if(Object.keys(errs).length) return;
    setBusy(true);setError('');
    try {
      await api('/team',{method:'POST',body:JSON.stringify({...teamForm,organization_id:Number(teamForm.organization_id)})});
      setTeamFormOpen(false);setTeamForm({name:'',email:'',password:'',organization_id:'',role_code:'CHANNEL_SALES'});
      appNotice.success('Đã tạo tài khoản nhân sự.'); await reload();
    } catch(e) {setError(e instanceof Error?e.message:'Không tạo được tài khoản.');}
    finally {setBusy(false);}
  };
  const pending = operations?.proposals.filter(p => p.status === 'PENDING_ADMIN').length ?? 0;
  const metrics = workspace.metrics;
  return <div className="space-y-5">
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
        ] as [string,number|null][]).map(([label,value], index) => <AppStatCard key={label} label={label} value={preview || value === null ? '—' : fmt(value)} icon={[Building2, ClipboardList, CalendarClock, Handshake, TrendingUp, UsersRound][index % 6]}/>)}
      </div>
      <div className={panel}><h3 className="font-semibold">Công việc cần xử lý</h3><p className="mt-2 text-sm text-muted-foreground">Hồ sơ đề xuất chờ duyệt: {preview || !operations ? '—' : fmt(pending)}. Mở mục Đề xuất trường để xử lý.</p></div>
    </>}
    {section === 'admin-schools' && <>
      <Dialog open={manualOpen} onOpenChange={open => { if (!busy) setManualOpen(open); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Thêm trường học</DialogTitle><DialogDescription>Tạo trường chính hoặc phân hiệu thuộc trường chính đã có.</DialogDescription></DialogHeader><div className="space-y-3">
        
        <p className="mb-3 text-xs text-muted-foreground">Với phân hiệu, nhập mã trường chính đã có để liên kết.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Loại đơn vị<select className="mt-1 w-full rounded-lg border bg-background p-2" value={manual.unit_type||'MAIN'} onChange={e=>setManual(m=>({...m,unit_type:e.target.value}))}><option value="MAIN">Trường chính</option><option value="BRANCH">Phân hiệu</option></select></label>
          {(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email','school_phone','reason'] as const).map(k=><label className="text-sm" key={k}>{({school_code:'Mã trường chính',name:'Tên trường/phân hiệu',province:'Tỉnh/thành',ward:'Phường/xã',address:'Địa chỉ',contact_name:'Người liên hệ',contact_position:'Chức vụ',contact_phone:'SĐT liên hệ',email:'Email',school_phone:'SĐT trường',reason:'Lý do tạo'} as Record<string,string>)[k]}<Input className="mt-1" aria-invalid={!!formErrors[k]} value={manual[k]||''} onChange={e=>{setManual(m=>({...m,[k]:e.target.value}));setFormErrors(x=>({...x,[k]:''}));}}/><FormError>{formErrors[k]}</FormError></label>)}
        </div>
        <FormActions busy={busy} onCancel={()=>setManualOpen(false)} onSave={()=>void createManual()} saveLabel="Lưu trường"/>
      </div></DialogContent></Dialog>
      <SchoolDirectory adminMode apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged}
        renderImportAction={openImport => <div className="flex flex-wrap items-center justify-end gap-2">
          <AppButton tone="green" premium className="h-11 px-5" disabled={preview} leadingIcon={<Plus className="size-4"/>}
            onClick={() => {setFormErrors({});setManualOpen(true);}}>Thêm trường</AppButton>
          <AppButton tone="blue" premium className="h-11 px-5" disabled={preview} leadingIcon={<FileSpreadsheet className="size-4"/>}
            onClick={openImport}>Import Excel</AppButton>
        </div>}/>
    </>}
    {section === 'admin-proposals' && <div className="space-y-5">
  <AppPageHeader eyebrow="QUẢN TRỊ / ĐỀ XUẤT TRƯỜNG" title="Quản lý đề xuất trường" description="Tiếp nhận, rà soát và phê duyệt đề xuất trường theo thẩm quyền."
    actions={<AppButton tone="blue" premium leadingIcon={<RefreshCw className="size-4"/>} disabled={busy||preview} onClick={()=>void reload()}>Làm mới</AppButton>}/>
  <AdminListPanel>
    <AdminListToolbar search={proposalDraft} onSearchChange={setProposalDraft} onSearch={()=>{setPage(1);setSearch(proposalDraft.trim());}}
      onReset={()=>{setProposalDraft('');setSearch('');setStatusFilter('ALL');setPage(1);}}
      placeholder="Tên trường, mã trường..." searchLabel="Tìm đề xuất trường"
      filters={<AppNativeSelect aria-label="Lọc trạng thái đề xuất" value={statusFilter} containerClassName="h-11 w-full sm:w-[200px]" onChange={e=>{setStatusFilter(e.target.value);setPage(1);}}>
        <option value="ALL">Tất cả trạng thái</option><option value="PENDING_MANAGER">Chờ Quản lý</option><option value="PENDING_ADMIN">Chờ Admin</option>
        <option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option>
      </AppNativeSelect>}/>
    {busy && <p className="px-6 py-3 text-sm text-muted-foreground">Đang tải đề xuất…</p>}
    <div className="overflow-x-auto">
      <table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Người đề xuất</th>
          <th className="px-5 py-4 text-center">Trạng thái</th><th className="px-5 py-4 text-center">Hạn xử lý</th><th className="px-5 py-4 text-center">Thao tác</th></tr></thead>
        <tbody>{proposals.map(p=><tr key={p.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
          <td className="px-5 py-4"><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.school_code} · {p.province} · {p.ward}</p>
            {p.possible_duplicate && <p className="mt-1 text-xs text-amber-700">Cần kiểm tra trùng</p>}</td>
          <td className="px-5 py-4"><p>{p.submitted_by}</p><p className="mt-1 text-xs text-muted-foreground">Quản lý: {p.manager_name}</p></td>
          <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.status} label={workflowLabels[p.status]??p.status}/></td>
          <td className="px-5 py-4 text-center tabular-nums">{workflowDate(p.review_due_at)}</td>
          <td className="px-5 py-4"><div className="flex items-center justify-center gap-2">
            {p.status==='PENDING_ADMIN' && can('channel_sales.school.directory.manage') && !preview && <AdminIconAction icon={Pencil} tone="blue" label={`Chỉnh sửa ${p.name}`} onClick={()=>openEdit(p)}/>}
            {!preview && can('channel_sales.school.directory.manage') && <AdminIconAction icon={History} tone="neutral" label={`Xem lịch sử ${p.name}`} onClick={()=>void showRevisions(p.id)}/>}
            {p.can_admin_review && !preview && <AdminIconAction icon={Check} tone="green" label={`Duyệt ${p.name}`} onClick={()=>{setSelected(p.id);setReason('');}}/>}
          </div></td>
        </tr>)}</tbody>
      </table>
      {!busy && proposals.length===0 && <p className="p-8 text-center text-sm text-muted-foreground">Không có đề xuất phù hợp.</p>}
    </div>
    {operations?.pagination && <AppPagination page={page} pageSize={proposalPageSize}
      total={operations.pagination.totals.proposals ?? 0} showSummary={false}
      disabled={busy} pageSizeOptions={[10,20,50]}
      onPageChange={setPage}
      onPageSizeChange={size=>{setProposalPageSize(size);setPage(1);}}/>}

</div>}
    {section === 'admin-team' && <div className="space-y-5">
  <AppPageHeader eyebrow="QUẢN TRỊ / NHÂN SỰ & ĐỐI TÁC" title="Nhân sự & đối tác"
    description="Quản lý tài khoản, tổ chức, vai trò và trạng thái nhân sự."
    actions={<AppButton tone="green" premium leadingIcon={<Plus className="size-4"/>}
      disabled={preview||!can('channel_sales.team.manage')} onClick={()=>{setFormErrors({});setTeamFormOpen(true);}}>Thêm nhân sự</AppButton>}/>
  <AdminListPanel>
    <AdminListToolbar search={teamDraft} onSearchChange={setTeamDraft}
      onSearch={()=>{setTeamSearch(teamDraft.trim());setTeamPage(1);}}
      onReset={()=>{setTeamDraft('');setTeamSearch('');setTeamStatus('ALL');setTeamPage(1);}}
      placeholder="Tên nhân sự, email hoặc tổ chức..." searchLabel="Tìm nhân sự và đối tác"
      filters={<AppNativeSelect aria-label="Lọc trạng thái nhân sự" value={teamStatus} containerClassName="h-11 w-full sm:w-[200px]"
        onChange={e=>{setTeamStatus(e.target.value);setTeamPage(1);}}>
        <option value="ALL">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="SUSPENDED">Tạm khóa</option>
      </AppNativeSelect>}/>
    <div className="overflow-x-auto">
      <table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Nhân sự</th><th className="px-5 py-4">Tổ chức</th>
          <th className="px-5 py-4 text-center">Vai trò</th><th className="px-5 py-4 text-center">Trạng thái</th>
          <th className="px-5 py-4 text-center">Thao tác</th></tr></thead>
        <tbody>{management?.team.filter(u=>(teamStatus==='ALL'||u.status===teamStatus)&&[u.name,u.email,u.organization_name].some(x=>x.toLocaleLowerCase('vi').includes(teamSearch.toLocaleLowerCase('vi'))))
          .slice((teamPage-1)*teamPageSize,teamPage*teamPageSize).map(u=><tr key={u.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
          <td className="px-5 py-4"><p className="font-semibold">{u.name}</p><p className="mt-1 text-xs text-muted-foreground">{u.email}</p></td>
          <td className="px-5 py-4">{u.organization_name}</td>
          <td className="px-5 py-4 text-center">{management.roles.find(r=>r.code===u.membership_type)?.name??u.membership_type}</td>
          <td className="px-5 py-4 text-center"><AdminStatusBadge status={u.status} label={u.status==='ACTIVE'?'Hoạt động':u.status==='SUSPENDED'?'Tạm khóa':u.status}/></td>
          <td className="px-5 py-4 text-center"><AdminIconAction icon={Eye} label={`Xem ${u.name}`} onClick={()=>setTeamDetail(u)}/></td>
        </tr>)}</tbody>
      </table>
      {!busy && management && !management.team.some(u=>(teamStatus==='ALL'||u.status===teamStatus)&&[u.name,u.email,u.organization_name].some(x=>x.toLocaleLowerCase('vi').includes(teamSearch.toLocaleLowerCase('vi'))))
        && <p className="p-8 text-center text-sm text-muted-foreground">Không có nhân sự phù hợp.</p>}
      {!management && <p className="p-8 text-center text-sm text-muted-foreground">{busy?'Đang tải nhân sự…':'Chưa có dữ liệu hoặc chưa đủ quyền.'}</p>}
    </div>
    {management && <AppPagination page={teamPage} pageSize={teamPageSize}
      total={management.team.filter(u=>(teamStatus==='ALL'||u.status===teamStatus)&&[u.name,u.email,u.organization_name].some(x=>x.toLocaleLowerCase('vi').includes(teamSearch.toLocaleLowerCase('vi')))).length}
      itemLabel="nhân sự" showSummary={false} pageSizeOptions={[10,20,50]}
      onPageChange={setTeamPage} onPageSizeChange={v=>{setTeamPageSize(v);setTeamPage(1);}}/>}
  </AdminListPanel>
  <Dialog open={teamFormOpen} onOpenChange={open=>{if(!busy)setTeamFormOpen(open);}}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Thêm nhân sự</DialogTitle><DialogDescription>Tạo tài khoản thuộc tổ chức được quản lý. Không cấp quyền Admin/BGĐ tại đây.</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['name','email','password'] as const).map(k=><label className="text-sm font-medium" key={k}>
          {({name:'Họ và tên',email:'Email',password:'Mật khẩu ban đầu (tối thiểu 12 ký tự)'} as Record<string,string>)[k]}
          <Input className="mt-1.5 h-11" type={k==='password'?'password':'text'} aria-invalid={!!formErrors[k]} value={teamForm[k]}
            onChange={e=>{setTeamForm(t=>({...t,[k]:e.target.value}));setFormErrors(x=>({...x,[k]:''}));}}/><FormError>{formErrors[k]}</FormError>
        </label>)}
        <label className="text-sm font-medium">Tổ chức
          <select className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3" value={teamForm.organization_id} onChange={e=>setTeamForm(t=>({...t,organization_id:e.target.value}))}>
            <option value="">Chọn tổ chức</option>{management?.organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
          </select><FormError>{formErrors.organization_id}</FormError>
        </label>
        <label className="text-sm font-medium">Vai trò
          <select className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3" value={teamForm.role_code} onChange={e=>setTeamForm(t=>({...t,role_code:e.target.value}))}>
            {management?.roles.filter(x=>!['ADMIN','BOARD'].includes(x.code)).map(x=><option key={x.code} value={x.code}>{x.name}</option>)}
          </select>
        </label>
      </div>
      <FormActions busy={busy} onCancel={()=>setTeamFormOpen(false)} onSave={()=>void createTeamMember()} saveLabel="Tạo tài khoản"/>
    </DialogContent>
  </Dialog>
  <Dialog open={teamDetail!==null} onOpenChange={open=>{if(!open)setTeamDetail(null);}}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Thông tin nhân sự</DialogTitle><DialogDescription>Chi tiết từ danh sách nhân sự được cấp quyền xem.</DialogDescription></DialogHeader>
      {teamDetail && <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-3 text-sm">
        <dt className="text-muted-foreground">Họ và tên</dt><dd className="font-semibold">{teamDetail.name}</dd>
        <dt className="text-muted-foreground">Email</dt><dd className="break-all">{teamDetail.email}</dd>
        <dt className="text-muted-foreground">Tổ chức</dt><dd>{teamDetail.organization_name}</dd>
        <dt className="text-muted-foreground">Vai trò</dt><dd>{management?.roles.find(r=>r.code===teamDetail.membership_type)?.name??teamDetail.membership_type}</dd>
        <dt className="text-muted-foreground">Trạng thái</dt><dd><AdminStatusBadge status={teamDetail.status} label={teamDetail.status==='ACTIVE'?'Hoạt động':teamDetail.status==='SUSPENDED'?'Tạm khóa':teamDetail.status}/></dd>
      </dl>}
      <div className="flex justify-end"><AppButton tone="outline" onClick={()=>setTeamDetail(null)}>Đóng</AppButton></div>
    </DialogContent>
  </Dialog>
</div>}
    {section === 'admin-capacity' && <AdminCapacityManagement apiBase={apiBase} token={token} abilities={abilities}/>}
    {section === 'admin-policies' && <div className="space-y-5">
      <AppPageHeader eyebrow="QUẢN TRỊ / CHÍNH SÁCH VẬN HÀNH" title="Quản lý chính sách vận hành"
        description="Theo dõi phiên bản chính sách và thời hạn xử lý đang được ghi nhận."/>
      <AdminListPanel>
        <AdminListToolbar search={policyDraft} onSearchChange={setPolicyDraft}
          onSearch={()=>{setPolicySearch(policyDraft.trim());setPolicyPage(1);}}
          onReset={()=>{setPolicyDraft('');setPolicySearch('');setPolicyStatus('ALL');setPolicyPage(1);}}
          placeholder="Tìm phiên bản hoặc trạng thái..." searchLabel="Tìm chính sách"
          filters={<AppNativeSelect aria-label="Lọc trạng thái chính sách" containerClassName="h-11 w-full sm:w-[200px]"
            value={policyStatus} onChange={e=>{setPolicyStatus(e.target.value);setPolicyPage(1);}}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang áp dụng</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="SUPERSEDED">Đã thay phiên bản</option>
          </AppNativeSelect>}/>
        <div className="overflow-x-auto">
          <table className={adminTableClass}>
            <thead className={adminTableHeadClass}><tr>
              <th className="px-5 py-4">Phiên bản</th><th className="px-5 py-4 text-center">Quản lý duyệt</th>
              <th className="px-5 py-4 text-center">Admin duyệt</th><th className="px-5 py-4 text-center">Trạng thái</th>
            </tr></thead>
            <tbody>{filteredPolicies.slice((policyPage - 1) * policyPageSize, policyPage * policyPageSize).map(p=>
              <tr key={p.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
                <td className="px-5 py-4 font-semibold">Phiên bản {p.version}</td>
                <td className="px-5 py-4 text-center">{p.manager_review_hours} giờ</td>
                <td className="px-5 py-4 text-center">{p.admin_review_hours} giờ</td>
                <td className="px-5 py-4 text-center"><AdminStatusBadge status={p.status} label={workflowLabels[p.status]??p.status}/></td>
              </tr>)}</tbody>
          </table>
          {!busy && filteredPolicies.length === 0 &&
            <p className="p-8 text-center text-sm text-muted-foreground">Không có chính sách phù hợp.</p>}
          {busy && <p className="p-5 text-sm text-muted-foreground">Đang tải chính sách…</p>}
        </div>
        <AppPagination page={policyPage} pageSize={policyPageSize} total={filteredPolicies.length}
          showSummary={false} disabled={busy} pageSizeOptions={[10,20,50]}
          onPageChange={setPolicyPage}
          onPageSizeChange={size=>{setPolicyPageSize(size);setPolicyPage(1);}}/>
      </AdminListPanel>
      <p className="text-xs text-muted-foreground">Chỉ hiển thị chính sách đã lưu; các SLA chưa được phê duyệt không tự động kích hoạt.</p>
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
      <FormActions busy={busy} onCancel={()=>setEditing(null)} onSave={()=>{const p=operations?.proposals.find(x=>x.id===editing);if(p)void saveEdit(p);}} saveLabel="Lưu thay đổi"/>
    </DialogContent></Dialog>
  </div>;
}
function Summary({label,value}:{label:string;value:number|null}) { return <div className={panel}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value===null?'—':fmt(value)}</p></div>; }
