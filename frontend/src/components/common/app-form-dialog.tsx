'use client';

import type { ReactNode } from 'react';
import { AppDialog } from '@/components/common/app-dialog';
import { AppButton } from '@/components/common/app-button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  formId: string;
  children: ReactNode;
  busy?: boolean;
  destructive?: boolean;
  submitLabel?: string;
};

/** Reusable form dialog with an accessible, external HTML form submit button. */
export function AppFormDialog({
  open, onOpenChange, title, description, formId, children,
  busy = false, destructive = false, submitLabel = 'Xác nhận lưu',
}: Props) {
  return <AppDialog open={open} onOpenChange={onOpenChange}
    title={title} description={description} busy={busy}
    footer={<>
      <AppButton type="button" tone="outline" disabled={busy} className="h-11 min-w-32" onClick={() => onOpenChange(false)}>
        Hủy
      </AppButton>
      <AppButton type="submit" form={formId} tone={destructive ? 'danger' : 'green'} busy={busy}
        className="h-11 min-w-40" disabled={busy}>
        {busy ? 'Đang xử lý…' : submitLabel}
      </AppButton>
    </>}>
    {children}
  </AppDialog>;
}
