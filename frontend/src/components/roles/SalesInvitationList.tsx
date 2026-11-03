'use client';

import { useState } from 'react';
import { CheckCircle2, History, XCircle } from 'lucide-react';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { AppStatusFilter } from '@/components/common/app-status-filter';
import { SalesListLayout, SalesListRow, SalesListToolbar } from '@/components/common/sales-list';
import { Badge } from '@/components/ui/badge';
import { workflowDate, workflowLabels, type SchoolOperationsWorkspace } from '@/lib/school-operations';

type Invitation = SchoolOperationsWorkspace['invitations'][number];
const columns = 'minmax(230px,2fr) minmax(145px,1fr) minmax(135px,1fr) minmax(125px,.9fr) minmax(145px,auto)';

export function SalesInvitationList({
  invitations, page, pageSize, total, loading, preview, pendingOnly,
  onPageChange, onPageSizeChange, onSearch, onPendingChange,
  onAccept, onReject, onHistory,
}: {
  invitations: Invitation[];
  page: number; pageSize: number; total: number; loading: boolean; preview: boolean;
  pendingOnly: boolean;
  onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
  onSearch: (term: string) => void; onPendingChange: (pending: boolean) => void;
  onAccept: (invitation: Invitation) => void; onReject: (invitation: Invitation) => void;
  onHistory: (invitation: Invitation) => void;
}) {
  const [searchDraft, setSearchDraft] = useState('');
  const [applied, setApplied] = useState('');
  const shown = invitations.filter(x => {
    if (pendingOnly && (x.status !== 'PENDING' || x.is_expired)) return false;
    if (!preview || !applied) return true; // Live searches are scoped by the API.
    const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
    return normalize([x.school_name,x.assignee_name,x.assigned_by,x.reason].join(' ')).includes(normalize(applied));
  });
  const filter = <AppStatusFilter ariaLabel="Lọc trạng thái phân bổ" value={pendingOnly ? 'PENDING' : 'ALL'} className="w-full sm:w-48" onValueChange={(next) => onPendingChange(next === 'PENDING')} options={[{value:"PENDING",label:"Chờ phản hồi"},{value:"ALL",label:"Tất cả trạng thái"}]} />;
  return <SalesListLayout columns={['Trường học','Sales/CTV nhận','Hạn phản hồi','Trạng thái','Thao tác']}
    template={columns} page={page} pageSize={pageSize}
    total={preview ? shown.length : total} loading={loading}
    onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}
    empty="Chưa có trường chờ nhận phân bổ."
    toolbar={<SalesListToolbar search={searchDraft} onSearchChange={setSearchDraft}
      onSearch={() => {setApplied(searchDraft.trim());onSearch(searchDraft.trim());}}
      onReset={() => {setSearchDraft('');setApplied('');onPendingChange(true);onSearch('');}}
      placeholder="Tên trường, nhân viên phân bổ..." searchLabel="Tìm trường chờ phân bổ"
      filters={filter}/>}>
    {shown.map(x => <SalesListRow key={x.id} template={columns}>
      <div className="min-w-0">
        <p className="font-semibold">{x.school_name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{x.assigned_by} · {x.reason}</p>
      </div>
      <div>{x.assignee_name}</div>
      <div className="tabular-nums">{workflowDate(x.respond_by)}</div>
      <div><Badge variant="outline">{x.is_expired ? 'Đã hết hạn' : workflowLabels[x.status] ?? x.status}</Badge></div>
      <div className="flex justify-end gap-2">
        {x.can_respond && !preview && <>
          <AdminIconAction icon={CheckCircle2} label={`Nhận trường ${x.school_name}`} onClick={() => onAccept(x)}/>
          <AdminIconAction icon={XCircle} tone="red" label={`Từ chối phân bổ ${x.school_name}`} onClick={() => onReject(x)}/>
        </>}
        {!preview && <AdminIconAction icon={History} tone="neutral" label={`Lịch sử ${x.school_name}`} onClick={() => onHistory(x)}/>}
      </div>
    </SalesListRow>)}
  </SalesListLayout>;
}
