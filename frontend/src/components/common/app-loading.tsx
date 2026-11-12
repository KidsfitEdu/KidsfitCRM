'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppSkeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`crm-skeleton block rounded-lg bg-muted ${className}`} />;
}

/** Shared layout-matched placeholder: the shell stays mounted while a view loads. */
export function PageLoading({ label = 'Đang chuẩn bị dữ liệu...' }: { label?: string }) {
  return <section role="status" aria-live="polite" aria-busy="true" aria-label={label} className="space-y-5">
    <div className="space-y-3"><AppSkeleton className="h-6 w-52" /><AppSkeleton className="h-3 w-80 max-w-full" /></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <AppSkeleton className="h-3 w-24" /><AppSkeleton className="h-7 w-20" /><AppSkeleton className="h-2 w-32 max-w-full" />
      </div>)}
    </div>
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex justify-between gap-4"><AppSkeleton className="h-5 w-44" /><AppSkeleton className="h-8 w-28" /></div>
      {Array.from({ length: 5 }, (_, index) => <div key={index} className="flex gap-4 items-center">
        <AppSkeleton className="h-9 w-9 shrink-0" /><AppSkeleton className="h-3 flex-1" /><AppSkeleton className="h-3 flex-1" /><AppSkeleton className="h-3 w-16" />
      </div>)}
    </div>
    <span className="sr-only">{label}</span>
  </section>;
}

export function InlineLoading({ label = 'Đang tải...' }: { label?: string }) {
  return <span role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />{label}
  </span>;
}

/** Generic request errors must not be mistaken for a backend outage. */
export function AppRequestErrorState({ detail, onRetry }: { detail?: string; onRetry?: () => void }) {
  return <section role="alert" className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
    <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
    <h2 className="font-semibold">Không thể tải nội dung</h2>
    <p className="max-w-md text-sm text-muted-foreground">{detail || 'Vui lòng kiểm tra quyền truy cập và thử lại.'}</p>
    {onRetry && <Button type="button" variant="outline" onClick={onRetry}><RefreshCw className="mr-2 size-4" />Thử lại</Button>}
  </section>;
}

/** Delay the indicator to avoid flash for requests that complete immediately. */
export function GlobalLoadingProvider({ children }: { children: ReactNode }) {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (fetching + mutating === 0) { setVisible(false); return; }
    const timer = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(timer);
  }, [fetching, mutating]);
  return <>
    <div role={visible ? 'progressbar' : undefined} aria-label={visible ? 'Đang đồng bộ dữ liệu' : undefined}
      className={`crm-global-progress fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden pointer-events-none ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="crm-global-progress-bar h-full w-1/3 bg-primary" />
    </div>
    {children}
  </>;
}
