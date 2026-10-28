'use client';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void;
  title: string; description: string; confirmLabel?: string;
  busy?: boolean; destructive?: boolean; onConfirm: () => void;
};

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Xác nhận', busy = false, destructive = false, onConfirm }: Props) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
        <AlertDialogAction variant={destructive ? 'destructive' : 'default'} disabled={busy} onClick={onConfirm}>{busy ? 'Đang xử lý…' : confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
