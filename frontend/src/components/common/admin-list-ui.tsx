'use client';

import type { FormEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RotateCcw, Search } from 'lucide-react';
import { AppButton } from '@/components/common/app-button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Layout shared by Admin lists, matching the approved School Directory. */
export function AdminListPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('crm-brand-surface overflow-hidden rounded-2xl border border-border/80 bg-card', className)}>
      {children}
    </section>
  );
}

export function AdminListToolbar({
  search,
  onSearchChange,
  onSearch,
  onReset,
  filters,
  placeholder,
  searchLabel,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  filters?: ReactNode;
  placeholder: string;
  searchLabel: string;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };
  return (
    <form role="search" onSubmit={submit}
      className="flex flex-wrap items-center gap-3 border-b border-border/80 px-5 py-5 sm:px-6">
      <div className="relative min-w-[220px] flex-[1_1_320px]">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label={searchLabel} value={search} onChange={event => onSearchChange(event.target.value)}
          placeholder={placeholder} className="h-11 w-full rounded-xl bg-card pl-10" />
      </div>
      {filters}
      <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
      <AppButton type="button" tone="outline" size="icon-lg"
        aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc"
        className="h-11 w-11 min-w-11 rounded-lg p-0"
        onClick={onReset}>
        <RotateCcw aria-hidden="true" className="size-4" />
      </AppButton>
    </form>
  );
}

type IconActionTone = 'green' | 'blue' | 'red' | 'neutral';
const actionTones: Record<IconActionTone, string> = {
  green: 'border-[#1b5e20] text-[#1b5e20] hover:bg-[#1b5e20] hover:text-white dark:border-[#81c784] dark:text-[#a5d6a7]',
  blue: 'border-[#0369a1] text-[#0369a1] hover:bg-[#0369a1] hover:text-white dark:border-sky-400 dark:text-sky-300',
  red: 'border-rose-500 text-rose-600 hover:bg-rose-600 hover:text-white dark:border-rose-400 dark:text-rose-300',
  neutral: 'border-slate-300 text-slate-600 hover:bg-slate-600 hover:text-white dark:border-slate-500 dark:text-slate-300',
};

/** Icon-only actions retain visible keyboard focus and Vietnamese accessible labels. */
export function AdminIconAction({
  icon: Icon,
  label,
  tone = 'green',
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  tone?: IconActionTone;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" title={label} aria-label={label} disabled={disabled}
      onClick={onClick}
      className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
        actionTones[tone])}>
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

export function AdminStatusBadge({ label, status }: { label: string; status: string }) {
  const positive = ['ACTIVE', 'APPROVED', 'COMPLETED'].includes(status);
  const negative = ['REJECTED', 'SUSPENDED', 'CANCELLED', 'EXPIRED'].includes(status);
  return (
    <span className={cn('inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
      positive ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
        : negative ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200'
          : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200')}>
      {label}
    </span>
  );
}

export const adminTableClass = 'w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm';
export const adminTableHeadClass = 'bg-[#1b5e20] text-xs font-bold uppercase tracking-[.06em] text-white';
export const adminTableCellClass = 'px-5 py-4 align-middle';
