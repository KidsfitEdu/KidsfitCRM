'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppButton } from '@/components/common/app-button';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  onPageChange: (page: number) => void;
};

export function paginationNumbers(page: number, pages: number): Array<number | 'ellipsis'> {
  if (pages <= 0) return [1];
  const visible = new Set([1, pages, page - 1, page, page + 1].filter(p => p >= 1 && p <= pages));
  if (page <= 3) for (let p = 1; p <= Math.min(pages, 4); p++) visible.add(p);
  if (page >= pages - 2) for (let p = Math.max(1, pages - 3); p <= pages; p++) visible.add(p);
  const sorted = [...visible].sort((a,b) => a-b);
  const values: Array<number | 'ellipsis'> = [];
  for (let i=0; i<sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i-1] > 1) values.push('ellipsis');
    values.push(sorted[i]);
  }
  return values;
}

export function AppPagination({ page, pageSize, total, disabled = false, onPageChange, pageSizeOptions, onPageSizeChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Phân trang danh sách" className="flex flex-col gap-4 border-t border-border/80 bg-card px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <span className="text-sm text-muted-foreground" aria-live="polite">
        Hiển thị {total > 0 ? `${start}–${end}` : '0'} / {total} trường
      </span>
      <div className="flex flex-wrap items-center gap-2.5">
        {pageSizeOptions && onPageSizeChange && <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Số dòng/trang
          <select aria-label="Số dòng mỗi trang" className="h-10 rounded-lg border border-input bg-background px-2 text-sm font-medium text-foreground" value={pageSize} disabled={disabled}
            onChange={event => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>}
        <div className="flex items-center gap-1" aria-label="Chọn trang">
          <AppButton tone="outline" size="sm" className="h-9 min-w-9 rounded-lg px-2" aria-label="Trang trước" disabled={disabled || page <= 1}
            leadingIcon={<ChevronLeft className="size-4"/>} onClick={() => onPageChange(page - 1)}>Trước</AppButton>
          {paginationNumbers(page,pages).map((item,index) => item === 'ellipsis'
            ? <span key={`ellipsis-${index}`} aria-hidden="true" className="grid size-9 place-items-center text-muted-foreground">…</span>
            : <AppButton key={item} size="sm" tone={item===page ? 'green' : 'outline'}
              className="h-9 min-w-9 rounded-lg px-2" aria-label={`Trang ${item}`}
              aria-current={item===page ? 'page' : undefined} disabled={disabled} onClick={() => onPageChange(item)}>{item}</AppButton>)}
          <AppButton tone="outline" size="sm" className="h-9 min-w-9 rounded-lg px-2" aria-label="Trang sau" disabled={disabled || page >= pages}
            onClick={() => onPageChange(page + 1)}>Sau <ChevronRight className="size-4"/></AppButton>
        </div>
      </div>
    </nav>
  );
}
