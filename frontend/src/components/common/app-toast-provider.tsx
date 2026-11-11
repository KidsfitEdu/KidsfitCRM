'use client';

import type { ReactNode } from 'react';
import { Toaster, toast } from '@/components/ui/toast';

type NoticeType = 'success' | 'info' | 'warning' | 'error';
const durations: Record<NoticeType, number> = { success: 4000, info: 5000, warning: 7000, error: 0 };

export const appNotice = {
  show(type: NoticeType, title: string, description?: string, id?: string) {
    toast.add({ ...(id ? { id } : {}), type, title, description, timeout: durations[type], priority: type === 'error' ? 'high' : 'low' });
  },
  /** Use the same id for successive results of one operation; Base UI updates in place. */
  operation(id: string, type: NoticeType, title: string, description?: string) {
    this.show(type, title, description, id);
  },
  success(title: string, description?: string) { this.show('success', title, description); },
  error(title: string, description?: string) { this.show('error', title, description); },
  warning(title: string, description?: string) { this.show('warning', title, description); },
  info(title: string, description?: string) { this.show('info', title, description); },
};

export function AppToastProvider({ children }: { children: ReactNode }) {
  return <Toaster>{children}</Toaster>;
}
