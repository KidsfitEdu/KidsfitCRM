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
export function AppPagination({ page, pageSize, total, disabled = false, onPageChange, pageSizeOptions, onPageSizeChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Phân trang danh sách" className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 px-4 py-3 text-sm sm:px-5">
      <span className="text-muted-foreground" aria-live="polite">
        {total > 0 ? `${start}–${end} / ${total} trường` : 'Chưa có trường'} · Trang {page}/{pages}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {pageSizeOptions && onPageSizeChange && <label className="mr-2 flex items-center gap-2 text-xs text-muted-foreground">
          Hiển thị
          <select aria-label="Số dòng mỗi trang" className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground" value={pageSize} disabled={disabled}
            onChange={event => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map(size => <option key={size} value={size}>{size} dòng</option>)}
          </select>
        </label>}
        <AppButton tone="outline" size="sm" aria-label="Trang trước" disabled={disabled || page <= 1}
          leadingIcon={<ChevronLeft className="size-4"/>} onClick={() => onPageChange(page - 1)}>Trước</AppButton>
        <AppButton tone="outline" size="sm" aria-label="Trang sau" disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}>Sau <ChevronRight className="size-4"/></AppButton>
      </div>
    </nav>
  );
}
