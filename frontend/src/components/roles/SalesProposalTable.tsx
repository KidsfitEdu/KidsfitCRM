'use client';

import { useState } from 'react';
import { Eye, History, Pencil, Send, Trash2 } from 'lucide-react';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { SalesListLayout, SalesListRow, SalesListToolbar } from '@/components/common/sales-list';
import { AdminStatusBadge } from '@/components/common/admin-list-ui';
import { workflowLabels, type SchoolOperationsWorkspace } from '@/lib/school-operations';

type Proposal = SchoolOperationsWorkspace['proposals'][number];
type Props = {
  proposals: Proposal[];
  page: number;
  total: number;
  pageSize: number;
  loading: boolean;
  preview: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpen: (proposal: Proposal) => void;
  onHistory: (proposal: Proposal) => void;
  onSearch: (term: string) => void;
  onStatusChange?: (status: string) => void;
  onEdit?: (proposal: Proposal) => void;
  onDelete?: (proposal: Proposal) => void;
  onSubmitDraft?: (proposal: Proposal) => void;
};

const template = 'minmax(260px,2fr) minmax(135px,.85fr) minmax(140px,.8fr) minmax(175px,1fr) 232px';

export function SalesProposalTable({
  proposals, page, total, pageSize, loading, preview, onPageChange, onPageSizeChange,
  onOpen, onHistory, onSearch, onStatusChange, onEdit, onDelete, onSubmitDraft,
}: Props) {
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('ALL');
  const [applied, setApplied] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
  // Server-side searches/status preserve correct totals across pages.
  const items = proposals.filter(x =>
    (!preview || status === 'ALL' || x.status === status) &&
    (!preview || !applied || normalize([x.name,x.school_code,x.submitted_by,x.province,x.ward].join(' ')).includes(normalize(applied))));
  const reset = () => {setTerm('');setApplied('');setStatus('ALL');onSearch('');onStatusChange?.('ALL');};
  const statusFilter = <AppNativeSelect aria-label="Trạng thái đề xuất"
    value={status} containerClassName="w-full sm:w-48"
    onChange={event => {setStatus(event.target.value);onStatusChange?.(event.target.value);}}>
    <option value="ALL">Tất cả trạng thái</option>
    <option value="DRAFT">Nháp</option>
    <option value="NEEDS_REVISION">Cần bổ sung</option>
    <option value="PENDING_MANAGER">Chờ Quản lý</option>
    <option value="PENDING_ADMIN">Chờ Admin</option>
    <option value="APPROVED">Đã duyệt</option>
    <option value="REJECTED">Từ chối</option>
  </AppNativeSelect>;
  return <SalesListLayout columns={['Trường học','Người đề xuất','Trạng thái','Khu vực','Thao tác']}
    template={template} page={preview ? 1 : page} pageSize={pageSize}
    total={preview ? items.length : total} loading={loading} minWidth={1020} centerColumns={[2,3]}
    onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}
    empty="Không có đề xuất trường phù hợp. Hãy thử bộ lọc khác."
    toolbar={<SalesListToolbar search={term} onSearchChange={setTerm}
      searchLabel="Tìm đề xuất trường" placeholder="Tên trường, mã trường, người đề xuất..."
      filters={statusFilter} onReset={reset}
      onSearch={() => {setApplied(term.trim());onSearch(term.trim());}}/>}>
    {items.map(item => <SalesListRow key={item.id} template={template}>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground" title={item.name}>{item.name || 'Chưa đặt tên trường'}</p>
        {!item.school_code.startsWith('SEED-SCH-') && !item.school_code.startsWith('DRAFT-') && (
          <p className="mt-1 truncate text-xs text-muted-foreground" title={item.school_code}>{item.school_code}</p>
        )}
      </div>
      <div className="min-w-0 truncate text-sm" title={item.submitted_by}>{item.submitted_by}</div>
      <div className="flex justify-center"><AdminStatusBadge label={workflowLabels[item.status] ?? item.status} status={item.status}/></div>
      <div className="min-w-0 text-center text-sm">
        <p className="truncate font-medium" title={item.province || 'Chưa cập nhật'}>{item.province || 'Chưa cập nhật'}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={item.ward || 'Chưa cập nhật'}>{item.ward || 'Chưa cập nhật'}</p>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1.5 whitespace-nowrap">
        <AdminIconAction icon={Eye} label={`Xem đề xuất ${item.name}`} onClick={() => onOpen(item)}/>
        {!preview && item.can_edit_draft && <>
          <AdminIconAction icon={Pencil} label={`Sửa bản nháp ${item.name}`} onClick={() => onEdit?.(item)}/>
          <AdminIconAction icon={Trash2} tone="red" label={`Xóa bản nháp ${item.name}`} onClick={() => onDelete?.(item)}/>
          <AdminIconAction icon={Send} label={`Gửi phê duyệt ${item.name}`} onClick={() => onSubmitDraft?.(item)}/>
        </>}
        {!preview && <AdminIconAction icon={History} tone="neutral" label={`Lịch sử ${item.name}`} onClick={() => onHistory(item)}/>}
      </div>
    </SalesListRow>)}
  </SalesListLayout>;
}
