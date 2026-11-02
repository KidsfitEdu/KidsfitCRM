'use client';

import type { CSSProperties, ReactNode } from 'react';
import { AdminListPanel, AdminListToolbar } from '@/components/common/admin-list-ui';
import { AppPagination } from '@/components/common/app-pagination';

type SearchProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  filters?: ReactNode;
  placeholder: string;
  searchLabel: string;
};

/** The same search/filter/action toolbar across Sales task lists. */
export function SalesListToolbar(props: SearchProps) {
  return <AdminListToolbar {...props}/>;
}

type ListProps = {
  columns: string[];
  template: string;
  children: ReactNode;
  empty?: ReactNode;
  minWidth?: number;
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  toolbar?: ReactNode;
};

export function SalesListLayout({
  columns, template, children, empty, minWidth = 780,
  page, pageSize, total, loading = false, onPageChange, onPageSizeChange, toolbar,
}: ListProps) {
  const style: CSSProperties = { gridTemplateColumns: template };
  return <AdminListPanel>
    {toolbar}
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth }}>
        <div role="row" style={style}
          className="grid items-center gap-3 bg-primary px-5 py-4 text-xs font-bold uppercase tracking-wide text-primary-foreground">
          {columns.map((heading, index) => <div key={index} role="columnheader"
            className={index === columns.length - 1 ? 'text-right' : ''}>{heading}</div>)}
        </div>
        <div role="rowgroup" className="divide-y divide-border/70">
          {children}
          {!loading && total === 0 && <div className="px-5 py-10 text-center text-sm text-muted-foreground">{empty ?? 'Không có dữ liệu phù hợp.'}</div>}
          {loading && <output className="block px-5 py-8 text-center text-sm text-muted-foreground">Đang tải dữ liệu…</output>}
        </div>
      </div>
    </div>
    <AppPagination page={page} pageSize={pageSize} total={total}
      showSummary={false} pageSizeOptions={[10,20,50,100]} disabled={loading}
      onPageChange={onPageChange} onPageSizeChange={onPageSizeChange}/>
  </AdminListPanel>;
}

export function SalesListRow({template, children}: {template:string;children:ReactNode}) {
  return <div role="row" style={{gridTemplateColumns:template}}
    className="grid items-center gap-3 px-5 py-4 text-sm transition-colors odd:bg-card even:bg-muted/20 hover:bg-muted/40">
    {children}
  </div>;
}
