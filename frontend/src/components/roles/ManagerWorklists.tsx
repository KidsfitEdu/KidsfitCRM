'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, History, Plus, X, Ban, ListChecks } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/app-button';
import { AppPagination } from '@/components/common/app-pagination';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AdminIconAction, AdminListPanel, AdminListToolbar, AdminStatusBadge, adminTableCellClass, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SchoolActionForm, type SchoolAction, type SchoolActionField } from '@/components/crm/school-action-form';
import { channelRequest, channelQueryKeys, ChannelRequestError } from '@/lib/channel-operations';
import { loadAllocationSchools } from '@/lib/manager-allocation';
import { appNotice } from '@/components/common/app-toast-provider';
import { workflowLabels, workflowDate, vietnamDateTimeInput, type SchoolOperationsWorkspace } from '@/lib/school-operations';
import { schoolOperationsPreview } from '@/lib/school-operations-preview';
import { demoChannelSalesWorkspace, type ChannelCustomer, type ChannelSalesWorkspace } from '@/lib/channel-sales';
import type { ManagerPageProps } from '@/types/manager-pages';

export type ManagerWorklistSection = 'proposals' | 'allocations' | 'progress' | 'extensions';
type Proposal = SchoolOperationsWorkspace['proposals'][number];
type Invitation = SchoolOperationsWorkspace['invitations'][number];
type Extension = SchoolOperationsWorkspace['extensions'][number];
type Selection =
  | { kind: 'proposal'; item: Proposal }
  | { kind: 'invitation'; item: Invitation }
  | { kind: 'extension'; item: Extension }
  | { kind: 'progress'; item: ChannelCustomer };
type Capacity = { id: number; name: string; organization_name: string; school_approach_limit: number; active: number };
type School = { id: number; display_name: string; school_code: string; visible_status: string; can_register: boolean };
type SchoolList = { data: School[]; total: number };
type CustomerTimeline = { activities: { id: number; activity_type: string; content: string; user_name: string; created_at: string; next_follow_up_at: string | null }[] };
type HistoryResult = { data: { id: number; action: string; actor_name: string; created_at: string; new_values: string | null }[] };

const headings: Record<ManagerWorklistSection, { title: string; description: string; placeholder: string }> = {
  proposals: { title: 'Quản lý đề xuất trường', description: 'Rà soát thông tin, phản hồi Sales/CTV và chuyển đề xuất hợp lệ đến Admin.', placeholder: 'Tên trường, mã trường, người đề xuất…' },
  allocations: { title: 'Phân bổ trường học', description: 'Chọn trường chưa có người nhận, mời Sales/CTV và theo dõi phản hồi phân bổ.', placeholder: 'Tên trường, nhân viên, lý do…' },
  progress: { title: 'Theo dõi tiến độ tiếp cận', description: 'Giám sát trường phụ trách, lịch hẹn và hoạt động theo phạm vi được phân quyền.', placeholder: 'Tên trường, nhân viên phụ trách…' },
  extensions: { title: 'Duyệt gia hạn tiếp cận', description: 'Kiểm tra tiến độ thực tế, bằng chứng và hạn bảo vệ trước khi quyết định.', placeholder: 'Tên trường, người yêu cầu, tiến độ…' },
};
const reason: SchoolActionField = { name: 'reason', label: 'Lý do / căn cứ quyết định', type: 'textarea' };
const nice = (date: string | null | undefined) => date ? workflowDate(date) : '—';
const datePending = (date: string | null | undefined) => !!date && new Date(date).getTime() <= Date.now();
const statusLabel = (code: string) => workflowLabels[code] ?? ({ AVAILABLE: 'Chưa đăng ký', APPROACHING: 'Đang tiếp cận', CONTRACTED: 'Đã ký hợp đồng' } as Record<string,string>)[code] ?? code;

export function ManagerWorklists({ section, apiBase, token, abilities, onChanged }: ManagerPageProps & { section: ManagerWorklistSection }) {
  const preview = !apiBase;
  const can = (p: string) => !preview && (abilities.includes('*') || abilities.includes(p));
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [history, setHistory] = useState<{ kind: string; id: number; name: string } | null>(null);
  const [action, setAction] = useState<SchoolAction | null>(null);
  const [confirmProposal, setConfirmProposal] = useState<{ id: number; name: string } | null>(null);
  const [confirmingProposal, setConfirmingProposal] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');
  const lastQueryFailure = useRef<unknown>(null);
  const client = useQueryClient();
  const api = <T,>(path: string, options?: RequestInit) => channelRequest<T>(apiBase, token, path, options);
  // Server paginates each collection by 100; the UI paginates the same window in steps of 10/20/50.
  const serverPage = Math.floor(((page - 1) * pageSize) / 100) + 1;
  const offset = ((page - 1) * pageSize) % 100;
  const serverStatus = section === 'proposals' && filter !== 'ALL' ? '&status=' + encodeURIComponent(filter) : '';
  const operations = useQuery({
    queryKey: [...channelQueryKeys.all, 'manager-lists', section, serverPage, search, serverStatus],
    queryFn: () => preview
      ? Promise.resolve(schoolOperationsPreview(abilities))
      : api<SchoolOperationsWorkspace>('/school-operations?page=' + serverPage + '&search=' + encodeURIComponent(search) + serverStatus),
    enabled: section !== 'progress' && (preview || !!token),
    placeholderData: previous => previous,
  });
  const customers = useQuery({
    queryKey: [...channelQueryKeys.all, 'manager-progress-customers'],
    queryFn: () => preview ? Promise.resolve(demoChannelSalesWorkspace) : api<ChannelSalesWorkspace>('/workspace'),
    enabled: section === 'progress' && (preview || !!token),
  });
  const availableSchools = useQuery({
    queryKey: [...channelQueryKeys.all, 'manager-available-schools'],
    queryFn: () => loadAllocationSchools<School>((page, pageSize) =>
      api<SchoolList>('/schools?page=' + page + '&pageSize=' + pageSize + '&status=AVAILABLE')),
    enabled: section === 'allocations' && !preview && !!token,
  });
  const capacities = useQuery({
    queryKey: [...channelQueryKeys.all, 'manager-capacities'],
    queryFn: () => api<{ data: Capacity[] }>('/school-capacities'),
    enabled: section === 'allocations' && !preview && !!token,
  });
  const timeline = useQuery({
    queryKey: [...channelQueryKeys.all, 'manager-customer-timeline', selection?.kind === 'progress' ? selection.item.id : null],
    queryFn: () => api<CustomerTimeline>('/customers/' + (selection?.kind === 'progress' ? selection.item.id : 0)),
    enabled: !!token && !preview && selection?.kind === 'progress',
  });
  const historyQuery = useQuery({
    queryKey: [...channelQueryKeys.all, 'manager-operation-history', history?.kind, history?.id],
    queryFn: () => api<HistoryResult>('/school-operations/' + history!.kind + '/' + history!.id + '/history'),
    enabled: !!token && !preview && history !== null,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: channelQueryKeys.all });
    await onChanged();
  };
  const describeApiError = (cause: unknown): string => {
    if (cause instanceof ChannelRequestError) {
      if (cause.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      if (cause.status === 403) return 'Tài khoản chưa có quyền truy cập dữ liệu trường hoặc phân bổ.';
      if (cause.status === 400) return 'Yêu cầu dữ liệu không hợp lệ: ' + cause.message;
      if (cause.status >= 500) return 'Máy chủ gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại.';
      return cause.message;
    }
    if (cause instanceof TypeError) return 'Không kết nối được Backend. Kiểm tra máy chủ và đường dẫn API.';
    return cause instanceof Error ? cause.message : 'Không thể tải dữ liệu. Vui lòng thử lại.';
  };
  const queryFailure = section === 'progress' ? customers.error : operations.error ?? (section === 'allocations' ? availableSchools.error : null);
  useEffect(() => {
    if (!queryFailure) {
      lastQueryFailure.current = null;
      return;
    }
    if (lastQueryFailure.current === queryFailure) return;
    lastQueryFailure.current = queryFailure;
    appNotice.error('Không thể tải dữ liệu CRM', describeApiError(queryFailure));
  }, [queryFailure]);
  useEffect(() => {
    if (section === 'allocations' && capacities.error) {
      appNotice.warning('Không tải được thông tin hạn mức',
        'Bạn vẫn có thể gửi lời mời; Backend sẽ kiểm tra hạn mức khi xử lý.');
    }
  }, [capacities.error, section]);
  const save = async (command: { path: string; method?: string; body: Record<string, unknown> }) => {
    if (preview) throw new Error('Chế độ demo chỉ đọc; cần kết nối Backend để thao tác.');
    await api(command.path, { method: command.method ?? 'POST', body: JSON.stringify(command.body) });
    setAction(null);
    appNotice.success(command.path === '/school-invitations'
      ? 'Đã gửi lời mời phân bổ trường'
      : 'Đã lưu quyết định', command.path === '/school-invitations'
        ? 'Sales/CTV sẽ nhận được lời mời để phản hồi.'
        : 'Danh sách công việc đã được cập nhật.');
    try { await refresh(); } catch {
      appNotice.warning('Đã lưu thành công', 'Không thể tải lại dữ liệu ngay. Vui lòng mở lại trang.');
    }
  };
  const decide = (kind: 'proposal' | 'extension', id: number, approve: boolean, fields: SchoolActionField[] = []) => {
    const title = kind === 'proposal'
      ? (approve ? 'Chuyển đề xuất lên Admin' : 'Từ chối đề xuất trường')
      : (approve ? 'Duyệt gia hạn tiếp cận' : 'Từ chối gia hạn');
    setAction({
      title,
      description: approve
        ? 'Kiểm tra hồ sơ và nhập căn cứ trước khi chuyển trạng thái. Hệ thống kiểm tra lại quyền và thời hạn tại thời điểm lưu.'
        : 'Bắt buộc ghi rõ lý do để Sales/CTV có thể theo dõi và bổ sung.',
      path: kind === 'proposal' ? '/school-proposals/' + id + '/manager-review' : '/school-extensions/' + id + '/review',
      fields: [...fields, reason],
      preset: { approve },
      submitLabel: approve ? 'Xác nhận' : 'Xác nhận từ chối',
      danger: !approve,
    });
  };
  const invite = () => {
    if (preview) { appNotice.info('Bản xem trước chỉ đọc', 'Đăng nhập Backend để phân bổ trường.'); return; }
    if (!can('channel_sales.school.allocation.manage')) {
      appNotice.error('Không có quyền phân bổ', 'Tài khoản chưa được cấp quyền phân bổ trường.');
      return;
    }
    if (operations.isPending || availableSchools.isPending) {
      appNotice.info('Đang tải dữ liệu', 'Vui lòng thử lại khi danh sách trường và Sales/CTV tải xong.');
      return;
    }
    if (operations.error || availableSchools.error) {
      appNotice.error('Không thể tải danh sách phân bổ', describeApiError(operations.error ?? availableSchools.error));
      return;
    }
    const members = operations.data?.team.filter(t => t.can_receive_school && t.status === 'ACTIVE') ?? [];
    const schools = availableSchools.data?.data.filter(s => s.visible_status === 'AVAILABLE') ?? [];
    if (!members.length || !schools.length) {
      appNotice.warning('Chưa đủ điều kiện phân bổ',
        !schools.length ? 'Không có trường chưa đăng ký phù hợp.' : 'Không có Sales/CTV đủ điều kiện nhận trường.');
      return;
    }
    setAction({
      title: 'Mời Sales/CTV nhận trường',
      description: 'Sau khi gửi lời mời, Sales/CTV cần xác nhận. Quyền tiếp cận chỉ bắt đầu khi nhận thành công và còn hạn mức.',
      path: '/school-invitations',
      fields: [
        { name: 'school_id', label: 'Trường chưa đăng ký', type: 'number', options: schools.map(s => ({ value: String(s.id), label: s.display_name + ' · ' + s.school_code })) },
        { name: 'organization_id', label: 'Tổ chức', type: 'number', options: (operations.data?.organizations ?? []).map(o => ({ value: String(o.id), label: o.name })) },
        { name: 'assignee_user_id', label: 'Sales/CTV nhận phân bổ', type: 'number', options: members.map(m => {
          const cap = capacities.data?.data.find(c => c.id === m.id);
          return { value: String(m.user_id), label: m.name + (cap ? ' · ' + cap.active + '/' + cap.school_approach_limit + ' trường' : '') };
        }) },
        { name: 'respond_by', label: 'Hạn phản hồi', type: 'datetime-local', value: vietnamDateTimeInput(new Date(Date.now() + 24 * 3600000).toISOString()) },
        reason,
      ],
    });
  };
  const records = operations.data;
  const proposalRows = records?.proposals.filter(p => filter === 'ALL' || p.status === filter) ?? [];
  const invitationRows = records?.invitations.filter(i => filter === 'ALL' || (i.is_expired ? 'EXPIRED' : i.status) === filter) ?? [];
  const extensionRows = records?.extensions.filter(e => filter === 'ALL' || (e.is_expired ? 'EXPIRED' : e.status) === filter) ?? [];
  const totalKey = section === 'proposals' ? 'proposals' : section === 'allocations' ? 'invitations' : 'extensions';
  const localRows = section === 'proposals' ? proposalRows.length : section === 'allocations' ? invitationRows.length : extensionRows.length;
  // Non-proposal status filters apply to the fetched server window, not unseen server pages.
  const serverTotal = records?.pagination?.totals[totalKey] ?? localRows;
  const windowRows = section === 'proposals' ? proposalRows.slice(offset, offset + pageSize)
    : section === 'allocations' ? invitationRows.slice(offset, offset + pageSize)
      : extensionRows.slice(offset, offset + pageSize);
  const progressRows = (customers.data?.data ?? []).filter(c =>
    (filter === 'ALL' || c.visible_status === filter) &&
    [c.display_name, c.owner_user_name ?? '', c.code].join(' ').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))
  );
  const progressPage = progressRows.slice((page - 1) * pageSize, page * pageSize);
  const total = section === 'progress' ? progressRows.length : serverTotal;
  const busy = section === 'progress' ? customers.isPending : operations.isPending;
  const failed = section === 'progress' ? customers.error : operations.error;
  const config = headings[section];
  const reset = () => { setDraft(''); setSearch(''); setFilter('ALL'); setPage(1); };

  return <div className="space-y-5">
    <AppPageHeader eyebrow={'QUẢN LÝ BÁN HÀNG / ' + config.title.toLocaleUpperCase('vi')}
      title={config.title} description={config.description}
      actions={<div className="flex flex-wrap gap-2">
        {section === 'allocations' && <AppButton tone="green" premium leadingIcon={<Plus className="size-4"/>}
          onClick={invite}>Phân bổ trường</AppButton>}
      </div>}/>
    {preview && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Dữ liệu minh họa chỉ đọc. Đăng nhập hệ thống kết nối API để phê duyệt và phân bổ.</p>}
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={() => { setSearch(draft.trim()); setPage(1); }}
        onReset={reset} searchLabel={'Tìm kiếm ' + config.title.toLocaleLowerCase('vi')} placeholder={config.placeholder}
        filters={<div className="flex flex-wrap gap-2">
          <AppNativeSelect aria-label="Lọc trạng thái" containerClassName="w-[192px]" value={filter}
            onChange={e => {setFilter(e.target.value);setPage(1);}}>
            <option value="ALL">Tất cả trạng thái</option>
            {section === 'proposals' ? <>
              <option value="PENDING_MANAGER">Chờ Quản lý</option><option value="PENDING_ADMIN">Chờ Admin</option>
              <option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option>
            </> : section === 'allocations' ? <>
              <option value="PENDING">Chờ nhận</option><option value="ACCEPTED">Đã nhận</option><option value="DECLINED">Từ chối</option>
              <option value="CANCELLED">Đã hủy</option><option value="EXPIRED">Quá hạn</option>
            </> : section === 'extensions' ? <>
              <option value="PENDING">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option>
              <option value="EXPIRED">Hết hạn</option>
            </> : <>
              <option value="AVAILABLE">Chưa đăng ký</option><option value="APPROACHING">Đang tiếp cận</option><option value="CONTRACTED">Đã ký hợp đồng</option>
            </>}
          </AppNativeSelect>
        </div>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}>
            {section === 'proposals' ? <tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Người đề xuất</th><th className="px-5 py-4">Quản lý</th><th className="px-5 py-4">Hạn xử lý</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-center">Thao tác</th></tr>
            : section === 'allocations' ? <tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Sales/CTV nhận</th><th className="px-5 py-4">Người phân bổ</th><th className="px-5 py-4">Hạn phản hồi</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-center">Thao tác</th></tr>
              : section === 'extensions' ? <tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Người yêu cầu</th><th className="px-5 py-4">Hạn bảo vệ</th><th className="px-5 py-4">Đề nghị đến</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-center">Thao tác</th></tr>
                : <tr><th className="px-5 py-4">Trường học</th><th className="px-5 py-4">Sales phụ trách</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4">Lịch hẹn tiếp</th><th className="px-5 py-4">Hạn bảo vệ</th><th className="px-5 py-4">Hợp đồng</th><th className="px-5 py-4 text-center">Chi tiết</th></tr>}
          </thead>
          <tbody>
            {section === 'proposals' && windowRows.map(row => {
              const p = row as Proposal;
              return <tr key={p.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
                <td className={adminTableCellClass}><p className="font-semibold">{p.name}</p><p className="mt-1 text-xs text-muted-foreground">{p.school_code} · {p.province} · {p.ward}</p>{p.possible_duplicate && <p className="mt-1 text-xs text-amber-700">Cần đối chiếu trùng trường</p>}</td>
                <td className={adminTableCellClass}>{p.submitted_by}</td><td className={adminTableCellClass}>{p.manager_name}</td>
                <td className={adminTableCellClass}><span className={p.is_overdue ? 'font-semibold text-rose-600' : ''}>{nice(p.review_due_at)}</span></td>
                <td className={adminTableCellClass}><AdminStatusBadge status={p.status} label={statusLabel(p.status)}/></td>
                <td className={adminTableCellClass}><div className="flex items-center justify-center gap-2">
                  <AdminIconAction icon={Eye} label={'Xem đề xuất ' + p.name} onClick={() => setSelection({kind:'proposal',item:p})}/>
                  {p.can_manager_review && can('channel_sales.school.proposal.review') && <>
                    <AdminIconAction icon={Check} label={'Chuyển Admin: ' + p.name} tone="green" onClick={() => { setConfirmationError(''); setConfirmProposal({ id: p.id, name: p.name }); }}/>
                    <AdminIconAction icon={X} label={'Từ chối ' + p.name} tone="red" onClick={() => decide('proposal',p.id,false)}/>
                  </>}
                  {!preview && <AdminIconAction icon={History} tone="neutral" label={'Lịch sử đề xuất ' + p.name} onClick={() => setHistory({kind:'proposal',id:p.id,name:p.name})}/>}
                </div></td>
              </tr>;
            })}
            {section === 'allocations' && windowRows.map(row => {
              const i = row as Invitation;
              return <tr key={i.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
                <td className={adminTableCellClass}><p className="font-semibold">{i.school_name}</p><p className="text-xs text-muted-foreground">{i.reason}</p></td>
                <td className={adminTableCellClass}>{i.assignee_name}</td><td className={adminTableCellClass}>{i.assigned_by}</td>
                <td className={adminTableCellClass}><span className={i.is_expired ? 'font-semibold text-rose-600' : ''}>{nice(i.respond_by)}</span></td>
                <td className={adminTableCellClass}><AdminStatusBadge status={i.is_expired?'EXPIRED':i.status} label={statusLabel(i.is_expired?'EXPIRED':i.status)}/></td>
                <td className={adminTableCellClass}><div className="flex justify-center gap-2">
                  <AdminIconAction icon={Eye} label={'Xem lời mời ' + i.school_name} onClick={() => setSelection({kind:'invitation',item:i})}/>
                  {i.can_cancel && can('channel_sales.school.allocation.manage') && <AdminIconAction icon={Ban} tone="red" label={'Hủy lời mời ' + i.school_name} onClick={() => setAction({title:'Hủy lời mời phân bổ',description:'Nhập lý do trước khi trả trường về danh sách có thể phân bổ.',path:'/school-invitations/'+i.id+'/cancel',fields:[reason],danger:true})}/>}
                  {!preview && <AdminIconAction icon={History} tone="neutral" label={'Lịch sử phân bổ ' + i.school_name} onClick={() => setHistory({kind:'invitation',id:i.id,name:i.school_name})}/>}
                </div></td>
              </tr>;
            })}
            {section === 'extensions' && windowRows.map(row => {
              const e = row as Extension;
              const expired = e.is_expired || datePending(e.original_protected_until);
              return <tr key={e.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
                <td className={adminTableCellClass}><p className="font-semibold">{e.school_name}</p><p className="mt-1 max-w-xs truncate text-xs text-muted-foreground" title={e.progress}>{e.progress}</p></td>
                <td className={adminTableCellClass}>{e.requested_by}</td><td className={adminTableCellClass}><span className={expired ? 'font-semibold text-rose-600' : ''}>{nice(e.original_protected_until)}</span></td>
                <td className={adminTableCellClass}>{nice(e.requested_until)}</td>
                <td className={adminTableCellClass}><AdminStatusBadge status={expired && e.status==='PENDING'?'EXPIRED':e.status} label={statusLabel(expired && e.status==='PENDING'?'EXPIRED':e.status)}/></td>
                <td className={adminTableCellClass}><div className="flex justify-center gap-2">
                  <AdminIconAction icon={Eye} label={'Xem bằng chứng ' + e.school_name} onClick={() => setSelection({kind:'extension',item:e})}/>
                  {e.can_review && can('channel_sales.school.extension.review') && !expired && <AdminIconAction icon={Check} label={'Duyệt gia hạn ' + e.school_name} tone="green" onClick={() => decide('extension',e.id,true,[
                    {name:'approved_until',label:'Gia hạn đến',type:'datetime-local',value:vietnamDateTimeInput(e.requested_until)},
                    {name:'next_review_at',label:'Ngày rà soát tiếp',type:'datetime-local'},
                  ])}/>}
                  {e.can_review && can('channel_sales.school.extension.review') && <AdminIconAction icon={X} label={'Từ chối gia hạn ' + e.school_name} tone="red" onClick={() => decide('extension',e.id,false)}/>}
                  {!preview && <AdminIconAction icon={History} tone="neutral" label={'Lịch sử gia hạn ' + e.school_name} onClick={() => setHistory({kind:'extension',id:e.id,name:e.school_name})}/>}
                </div></td>
              </tr>;
            })}
            {section === 'progress' && progressPage.map(c => <tr key={c.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
              <td className={adminTableCellClass}><p className="font-semibold">{c.display_name}</p><p className="mt-1 text-xs text-muted-foreground">{c.code}</p></td>
              <td className={adminTableCellClass}>{c.owner_user_name ?? 'Chưa phân công'}</td>
              <td className={adminTableCellClass}><AdminStatusBadge status={c.visible_status} label={statusLabel(c.visible_status)}/></td>
              <td className={adminTableCellClass}>{nice(c.next_follow_up_at)}</td>
              <td className={adminTableCellClass}><span className={datePending(c.protected_until) && c.visible_status==='APPROACHING'?'text-rose-600 font-semibold':''}>{nice(c.protected_until)}</span></td>
              <td className={adminTableCellClass}>{c.contract_code ?? '—'}</td>
              <td className={adminTableCellClass}><div className="flex justify-center"><AdminIconAction icon={ListChecks} label={'Xem hoạt động ' + c.display_name} onClick={() => setSelection({kind:'progress',item:c})}/></div></td>
            </tr>)}
          </tbody>
        </table>
        {!busy && failed && <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Không thể tải danh sách.</p>
          <Button type="button" variant="outline" onClick={() => {
            if (section === 'progress') void customers.refetch();
            else void operations.refetch();
          }}>Thử lại</Button>
        </div>}
        {!busy && !failed && (section === 'progress' ? progressPage.length === 0 : windowRows.length === 0) &&
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Không có hồ sơ phù hợp. Thử tìm kiếm hoặc chọn trạng thái khác.</div>}
        {busy && <div className="px-6 py-10 text-center text-sm text-muted-foreground">Đang tải dữ liệu…</div>}
      </div>
      {section !== 'progress' && filter !== 'ALL' && section !== 'proposals' &&
        <p className="px-5 py-2 text-xs text-muted-foreground">Bộ lọc trạng thái áp dụng trong nhóm 100 hồ sơ đã tải; số trang vẫn phản ánh toàn bộ hồ sơ thuộc quyền xem.</p>}
      <AppPagination page={page} pageSize={pageSize} total={total} disabled={busy} showSummary={false}
        pageSizeOptions={[10,20,50]} onPageSizeChange={n=>{setPageSize(n);setPage(1);}} onPageChange={setPage}/>
    </AdminListPanel>
    <Dialog open={confirmProposal!==null} onOpenChange={open => { if (!open && !confirmingProposal) setConfirmProposal(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Xác nhận chuyển đề xuất</DialogTitle>
          <DialogDescription className="text-[15px] leading-7 text-foreground/90 sm:text-base">
            Bạn có xác nhận chuyển đề xuất trường <strong className="text-foreground">{confirmProposal?.name}</strong> lên Admin để xem xét và phê duyệt không?
          </DialogDescription>
        </DialogHeader>
        {confirmationError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{confirmationError}</p>}
        <div className="flex flex-col-reverse items-stretch justify-center gap-3 pt-2 sm:flex-row sm:items-center">
          <Button type="button" variant="outline" disabled={confirmingProposal} className="h-11 w-full font-semibold sm:w-40" onClick={() => setConfirmProposal(null)}>Hủy</Button>
          <Button type="button" disabled={confirmingProposal} className="h-11 w-full bg-[#1b5e20] font-semibold text-white hover:bg-[#124c17] sm:w-40" onClick={async () => {
            if (!confirmProposal || confirmingProposal) return;
            setConfirmingProposal(true);
            setConfirmationError('');
            try {
              await save({ path: '/school-proposals/' + confirmProposal.id + '/manager-review', body: { approve: true, reason: null, review_due_at: null } });
              setConfirmProposal(null);
            } catch (cause) {
              setConfirmationError(cause instanceof Error ? cause.message : 'Không thể chuyển đề xuất.');
            } finally { setConfirmingProposal(false); }
          }}>{confirmingProposal ? 'Đang chuyển…' : 'Xác nhận chuyển'}</Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={action!==null} onOpenChange={v=>{if(!v)setAction(null);}}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {action && <SchoolActionForm key={action.path+'-'+action.title} action={action} save={save}/>}
      </DialogContent>
    </Dialog>
    <Dialog open={selection!==null} onOpenChange={v=>{if(!v)setSelection(null);}}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Chi tiết hồ sơ</DialogTitle><DialogDescription>Thông tin trong phạm vi quản lý được Backend cho phép truy cập.</DialogDescription></DialogHeader>
        {selection?.kind==='proposal' && <div className="space-y-3 text-sm">
          <p className="font-semibold text-base">{selection.item.name}</p>
          <p>Mã trường: {selection.item.school_code} · {selection.item.province} · {selection.item.ward}</p>
          <p>Người đề xuất: {selection.item.submitted_by} · Quản lý: {selection.item.manager_name}</p>
          <p>Lý do đề xuất: {selection.item.reason}</p><p>Hạn xử lý: {nice(selection.item.review_due_at)}</p>
          {selection.item.possible_duplicate && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Có khả năng trùng tên/khu vực. Admin cần đối chiếu mã định danh.</p>}
          {selection.item.decision_reason && <p>Phản hồi: {selection.item.decision_reason}</p>}
        </div>}
        {selection?.kind==='invitation' && <div className="space-y-3 text-sm">
          <p className="font-semibold text-base">{selection.item.school_name}</p>
          <p>{selection.item.assigned_by} → {selection.item.assignee_name}</p><p>Lý do: {selection.item.reason}</p>
          <p>Hạn phản hồi: {nice(selection.item.respond_by)}</p><p>Trạng thái: {statusLabel(selection.item.status)}</p>
          {selection.item.response_reason && <p>Phản hồi: {selection.item.response_reason}</p>}
        </div>}
        {selection?.kind==='extension' && <div className="space-y-3 text-sm">
          <p className="font-semibold text-base">{selection.item.school_name} · {selection.item.requested_by}</p>
          <p>Tiến độ: {selection.item.progress}</p>
          <p>Bằng chứng: {selection.item.evidence_reference || 'Chưa có'}</p>
          <p>Hạn gốc: {nice(selection.item.original_protected_until)} · Xin đến: {nice(selection.item.requested_until)}</p>
          <p>Lịch hẹn: {nice(selection.item.next_appointment_at)} · Hạn duyệt: {nice(selection.item.review_due_at)}</p>
          {selection.item.approved_until && <p>Đã duyệt đến: {nice(selection.item.approved_until)}</p>}
          {selection.item.decision_reason && <p>Quyết định: {selection.item.decision_reason}</p>}
          {selection.item.is_expired && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Quyền cũ đã hết hạn. Hồ sơ chờ duyệt không tự giữ suất tiếp cận.</p>}
        </div>}
        {selection?.kind==='progress' && <div className="space-y-3 text-sm">
          <p className="font-semibold text-base">{selection.item.display_name}</p>
          <p>Phụ trách: {selection.item.owner_user_name ?? 'Chưa có'} · Trạng thái: {statusLabel(selection.item.visible_status)}</p>
          <p>Lịch hẹn tiếp: {nice(selection.item.next_follow_up_at)} · Hạn bảo vệ: {nice(selection.item.protected_until)}</p>
          <h3 className="pt-2 font-semibold">Nhật ký hoạt động</h3>
          {preview && <p>Nhật ký hoạt động chỉ có trong API thật.</p>}
          {timeline.isPending && !preview && <p>Đang tải nhật ký…</p>}
          {timeline.error && <p role="alert" className="text-red-600">{timeline.error.message}</p>}
          {timeline.data?.activities.map(a=><div key={a.id} className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{nice(a.created_at)} · {a.user_name} · {a.activity_type}</p>
            <p className="mt-1">{a.content}</p>
            {a.next_follow_up_at && <p className="mt-1 text-xs">Hẹn tiếp: {nice(a.next_follow_up_at)}</p>}
          </div>)}
          {timeline.data && !timeline.data.activities.length && <p>Chưa ghi nhận hoạt động nào có thể xem.</p>}
        </div>}
      </DialogContent>
    </Dialog>
    <Dialog open={history!==null} onOpenChange={v=>{if(!v)setHistory(null);}}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Lịch sử xử lý</DialogTitle><DialogDescription>{history?.name}</DialogDescription></DialogHeader>
        {historyQuery.isPending && <p className="text-sm">Đang tải lịch sử…</p>}
        {historyQuery.error && <p role="alert" className="text-red-600">{historyQuery.error.message}</p>}
        {historyQuery.data?.data.map(entry=><div key={entry.id} className="rounded-xl border p-3 text-sm">
          <p className="font-semibold">{entry.action}</p>
          <p className="text-xs text-muted-foreground">{entry.actor_name} · {nice(entry.created_at)}</p>
        </div>)}
        {historyQuery.data && !historyQuery.data.data.length && <p className="text-sm">Chưa có lịch sử xử lý.</p>}
      </DialogContent>
    </Dialog>
  </div>;
}
