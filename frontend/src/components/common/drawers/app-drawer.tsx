'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Sheet, SheetContent, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/common/buttons/app-button';

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
      className="right-0 h-dvh w-screen max-w-none gap-0 overflow-hidden border-l border-border bg-card p-0 shadow-[0_22px_80px_rgba(14,42,26,.22)] sm:w-[min(560px,100vw)]">
      <header className="relative w-full shrink-0 self-stretch bg-[#1b5e20] px-5 py-5 pr-16 text-white">
        <div className="min-w-0">
          <div className="min-w-0 space-y-1">
            <span className="text-[11px] font-semibold tracking-[.14em] text-[#d8eedb]">KIDSFIT CRM</span>
            <SheetTitle className="text-lg font-bold leading-snug text-white">{title}</SheetTitle>
          </div>
          <button type="button" title="Đóng" aria-label="Đóng ngăn chi tiết" disabled={busy} onClick={()=>onOpenChange(false)}
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50">
            <X aria-hidden="true" className="size-5"/>
          </button>
        </div>
        <SheetDescription className={description ? 'mt-1 text-sm text-[#d8eedb]' : 'sr-only'}>
          {description ?? title}
        </SheetDescription>
      </header>
      <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5',bodyClassName)}>
        {children}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
        {footer ?? <AppButton tone="neutral" type="button" onClick={()=>onOpenChange(false)}>Đóng</AppButton>}
      </div>
    </SheetContent>
  </Sheet>;
}
