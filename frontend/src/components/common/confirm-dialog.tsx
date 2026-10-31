'use client';

import type { ReactNode } from 'react';
import { AppDialog } from '@/components/common/app-dialog';
import { AppButton } from '@/components/common/app-button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  children?: ReactNode;
};

/** Shared KIDSFIT confirmation shell, with no icon on the primary action. */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = 'Xác nhận',
  busy = false, destructive = false, onConfirm, children,
}: Props) {
  return <AppDialog open={open} onOpenChange={onOpenChange} title={title} footerAlign="center"
    busy={busy} contentClassName="sm:max-w-md"
    footer={<>
      <AppButton type="button" tone="outline" disabled={busy} className="h-11 w-full sm:w-40"
        onClick={() => onOpenChange(false)}>Hủy</AppButton>
      <AppButton type="button" tone={destructive ? 'danger' : 'green'} busy={busy}
        className="h-11 w-full sm:w-40" onClick={onConfirm}>
        {busy ? 'Đang xử lý…' : confirmLabel}
      </AppButton>
    </>}>
    <div className="space-y-4">
      <p className="text-[15px] leading-7 text-foreground/90 sm:text-base">{description}</p>
      {children}
    </div>
  </AppDialog>;
}
