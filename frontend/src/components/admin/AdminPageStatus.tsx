import type { ReactNode } from 'react';

/** Retains the legacy loading-error and offline-demo notices on every Admin page. */
export function AdminPageStatus({ apiBase, error, children }: { apiBase: string; error?: string; children: ReactNode }) {
  return <div className="space-y-5">
    {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {!apiBase && <div className="rounded-xl border bg-muted/50 p-3 text-sm text-muted-foreground">Chế độ xem thử: dữ liệu thống kê quản trị chưa được kết nối API. Không hiển thị số liệu giả.</div>}
    {children}
  </div>;
}
