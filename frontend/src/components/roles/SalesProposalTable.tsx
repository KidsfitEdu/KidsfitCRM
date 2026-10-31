'use client';

import { useState, type SyntheticEvent } from 'react';
import { Eye, History, Plus, RotateCcw, Search } from 'lucide-react';
import { AppButton } from '@/components/common/app-button';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { workflowDate, workflowLabels, type SchoolOperationsWorkspace } from '@/lib/school-operations';

type Proposal = SchoolOperationsWorkspace['proposals'][number];
type Props = {
  proposals: Proposal[];
  page: number;
  total: number;
  pageSize: number;
  loading: boolean;
  canCreate: boolean;
  preview: boolean;
  onPageChange: (page: number) => void;
  onCreate: () => void;
  onOpen: (proposal: Proposal) => void;
  onHistory: (proposal: Proposal) => void;
  onSearch: (term: string) => void;
};

export function SalesProposalTable({proposals, page, total, pageSize, loading, canCreate, preview, onPageChange,
  onCreate, onOpen, onHistory, onSearch}: Props) {
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('ALL');
  const [applied, setApplied] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('vi');
  const items = proposals.filter(x =>
    (status === 'ALL' || x.status === status) &&
    (!applied || normalize([x.name,x.school_code,x.submitted_by,x.province,x.ward].join(' ')).includes(normalize(applied))));
  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApplied(term.trim());
    onSearch(term.trim());
  };
  const reset = () => {setTerm('');setApplied('');setStatus('ALL');onSearch('');};
  return <div className="min-w-0">
    <form onSubmit={submit} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4 sm:px-5">
      <div className="relative min-w-[190px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
        <Input aria-label="Tìm đề xuất trường" className="h-11 w-full rounded-xl pl-10"
          placeholder="Tên trường, mã trường, người đề xuất..." value={term} onChange={e=>setTerm(e.target.value)}/>
      </div>
      <AppNativeSelect aria-label="Trạng thái đề xuất" value={status} containerClassName="w-full sm:w-48"
        onChange={e=>setStatus(e.target.value)}>
        <option value="ALL">Tất cả trạng thái</option>
        <option value="PENDING_MANAGER">Chờ Quản lý</option>
        <option value="PENDING_ADMIN">Chờ Admin</option>
        <option value="APPROVED">Đã duyệt</option>
        <option value="REJECTED">Từ chối</option>
      </AppNativeSelect>
      <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
      <AppButton type="button" tone="outline" size="icon-lg" className="h-11 w-11 min-w-11 rounded-lg p-0"
        aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={reset}>
        <RotateCcw className="size-4" aria-hidden="true"/>
      </AppButton>
      {canCreate && !preview && <AppButton type="button" tone="green" onClick={onCreate}>
        <Plus className="mr-1 size-4"/> Thêm mới
      </AppButton>}
    </form>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-[#1b5e20] text-xs font-bold uppercase tracking-[.06em] text-white">
          <tr><th className="px-5 py-4">Trường học</th><th className="px-4 py-4">Người đề xuất</th>
          <th className="px-4 py-4">Trạng thái</th><th className="px-4 py-4">Hạn xử lý</th>
          <th className="px-5 py-4 text-center">Thao tác</th></tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {items.map(item=><tr key={item.id} className="transition-colors even:bg-muted/20 hover:bg-muted/40">
            <td className="px-5 py-4 align-middle">
              <p className="font-semibold text-foreground">{item.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.school_code.startsWith('SEED-SCH-') ? '' : item.school_code+' · '}{item.province} · {item.ward}
              </p>
            </td>
            <td className="px-4 py-4 align-middle">{item.submitted_by}</td>
            <td className="px-4 py-4 align-middle"><Badge variant="outline">{workflowLabels[item.status] ?? item.status}</Badge></td>
            <td className="px-4 py-4 align-middle tabular-nums">{workflowDate(item.review_due_at)}</td>
            <td className="px-5 py-4 align-middle">
              <div className="flex items-center justify-center gap-2">
                <Button type="button" variant="outline" size="icon" title={`Xem đề xuất ${item.name}`}
                  aria-label={`Xem đề xuất ${item.name}`} onClick={()=>onOpen(item)}><Eye className="size-4"/></Button>
                {!preview && <Button type="button" variant="outline" size="icon" title={`Lịch sử ${item.name}`}
                  aria-label={`Lịch sử ${item.name}`} onClick={()=>onHistory(item)}><History className="size-4"/></Button>}
              </div>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {!items.length && <p className="p-10 text-center text-sm text-muted-foreground">Không có đề xuất trường phù hợp. Hãy thử bộ lọc khác.</p>}
    {!preview && <AppPagination page={page} pageSize={pageSize} total={total} disabled={loading}
      onPageChange={onPageChange}/>}
  </div>;
}
