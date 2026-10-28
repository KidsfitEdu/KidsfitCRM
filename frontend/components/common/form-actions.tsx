'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

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
    <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Hủy</Button>
    <Button type="button" disabled={busy || disabled} onClick={onSave}>{busy ? 'Đang lưu...' : saveLabel}</Button>
  </div>;
}
