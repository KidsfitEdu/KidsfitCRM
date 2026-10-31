'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/common/app-button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  bodyClassName?: string;
};

/** Shared CRM right-side detail/history drawer; not a form or data access layer. */
export function AppDrawer({ open, onOpenChange, title, description, children, footer, busy = false, bodyClassName }: Props) {
  return <Sheet open={open} onOpenChange={next=>{if(!busy)onOpenChange(next);}}>
    <SheetContent side="right" showCloseButton={false}
      className="h-dvh w-full max-w-full gap-0 overflow-hidden border-l border-border bg-card p-0 shadow-[0_22px_80px_rgba(14,42,26,.22)] sm:w-[min(560px,95vw)] sm:max-w-none">
      <div className="shrink-0 bg-[#1b5e20] px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <span className="text-[11px] font-semibold tracking-[.14em] text-[#d8eedb]">KIDSFIT CRM</span>
            <SheetTitle className="text-lg font-bold leading-snug text-white">{title}</SheetTitle>
          </div>
          <button type="button" title="Đóng" aria-label="Đóng" disabled={busy} onClick={()=>onOpenChange(false)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50">
            <X aria-hidden="true" className="size-5"/>
          </button>
        </div>
        <SheetDescription className={description ? 'mt-1 text-sm text-[#d8eedb]' : 'sr-only'}>
          {description ?? title}
        </SheetDescription>
      </div>
      <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5',bodyClassName)}>
        {children}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
        {footer ?? <AppButton tone="neutral" type="button" onClick={()=>onOpenChange(false)}>Đóng</AppButton>}
      </div>
    </SheetContent>
  </Sheet>;
}
