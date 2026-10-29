'use client';

import type { ReactNode } from 'react';
import { AppButton } from '@/components/common/app-button';

type Props = {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  children?: ReactNode;
};

export function FormActions({ onCancel, onSave, saveLabel = 'Lưu', busy = false, disabled = false, children }: Props) {
  return <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur-sm">
    {children}
    <AppButton type="button" tone="outline" disabled={busy} onClick={onCancel}>Hủy</AppButton>
    <AppButton type="button" disabled={busy || disabled} busy={busy} onClick={onSave}>{busy ? 'Đang lưu...' : saveLabel}</AppButton>
  </div>;
}
