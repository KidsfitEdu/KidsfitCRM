'use client';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type StatusFilterOption = {
  value: string;
  label: string;
};

type AppStatusFilterProps = {
  /** Accessible name describing the status filter's purpose. */
  ariaLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly StatusFilterOption[];
  className?: string;
  disabled?: boolean;
};

/** Keep status semantics in each page; only the filter presentation is shared. */
function statusDot(value: string): string {
  if (value === 'ALL') return 'bg-primary';
  if (['AVAILABLE', 'DRAFT', 'INACTIVE'].includes(value)) return 'bg-slate-400';
  if (['DISPUTED', 'NEEDS_REVISION', 'NEEDS_INFO', 'PENDING_ADMIN'].includes(value)) return 'bg-sky-500';
  if (['REJECTED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'SUSPENDED'].includes(value)) return 'bg-rose-500';
  if (['APPROVED', 'CONFIRMED', 'ACTIVE', 'ACCEPTED', 'CONTRACTED', 'MANAGER_REVIEWED'].includes(value)) return 'bg-emerald-500';
  return 'bg-amber-500';
}

/** Branded, keyboard-accessible popup that does not inherit native option hover styling. */
export function AppStatusFilter({
  ariaLabel,
  value,
  onValueChange,
  options,
  className,
  disabled,
}: AppStatusFilterProps) {
  const selected = options.find(option => option.value === value);
  const selectedLabel = selected?.label ?? options[0]?.label ?? 'Chọn trạng thái';

  return (
    <Select
      value={value}
      disabled={disabled || options.length === 0}
      onValueChange={next => {
        if (typeof next === 'string' && next !== value) onValueChange(next);
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'h-11 w-full min-w-0 justify-between gap-2 rounded-xl border-input bg-background px-3.5 py-2 text-sm font-medium shadow-sm',
          'transition-colors hover:border-primary/60 hover:bg-accent/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'data-[popup-open]:border-primary/60 data-[popup-open]:ring-2 data-[popup-open]:ring-primary/15',
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', statusDot(value))} />
          <span className="truncate">{selectedLabel}</span>
        </span>
      </SelectTrigger>
      <SelectContent
        side="bottom"
        align="end"
        alignItemWithTrigger={false}
        sideOffset={6}
        className="z-[100] max-h-[min(60vh,20rem)] min-w-[min(90vw,17rem)] max-w-[min(90vw,23rem)] rounded-xl border border-border/80 bg-popover p-1.5 shadow-xl ring-0"
      >
        {options.map(option => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn(
              'min-h-10 rounded-lg px-3 py-2 pr-9 text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
              'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
              option.value === value && 'bg-primary/10 font-semibold text-primary',
            )}
          >
            <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', statusDot(option.value))} />
            <span>{option.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
