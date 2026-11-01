'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
  footerAlign?: 'start' | 'center' | 'end';
};

/** KIDSFIT CRM dialog shell: one consistent brand header, scrollable content and fixed footer. */
export function AppDialog({
  open, onOpenChange, title, description, eyebrow = 'KIDSFIT CRM',
  children, footer, busy = false, contentClassName, bodyClassName, footerAlign = 'end',
}: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={next => { if (!busy) onOpenChange(next); }}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex max-h-[min(90dvh,800px)] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-[20px] border-border/60 bg-card p-0 sm:p-0 shadow-[0_28px_95px_rgba(14,42,26,.24)] sm:max-w-2xl',
          contentClassName,
        )}
      >
        <DialogHeader className="shrink-0 bg-[#1b5e20] px-5 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#dcf3dd]">{eyebrow}</span>
              <DialogTitle className="text-lg font-bold leading-snug text-white sm:text-xl">{title}</DialogTitle>
            </div>
            <button
              type="button" aria-label="Đóng hộp thoại" title="Đóng"
              disabled={busy} onClick={() => onOpenChange(false)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          {description
            ? <DialogDescription className="pt-1 text-sm leading-6 text-white/90">{description}</DialogDescription>
            : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6', bodyClassName)}>
          {children}
        </div>
        {footer && (
          <div className={cn("flex shrink-0 flex-wrap items-center gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:px-6", footerAlign === "center" ? "justify-center" : footerAlign === "start" ? "justify-start" : "justify-end")}>
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
