'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type AppSelectProps = {
  /** Accessible name, even when no visible label is provided. */
  ariaLabel: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly AppSelectOption[];
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  size?: 'default' | 'compact';
};

/**
 * Branded dropdown for list filters and pagination.
 *
 * Uses the existing Base UI Select primitive (portal, automatic collision handling,
 * focus management and keyboard navigation). Keep native selects for time pickers
 * and form controls that rely on the HTML select event/validation contract.
 */
export function AppSelect({
  ariaLabel, value, onValueChange, options, disabled, id, placeholder,
  className, contentClassName, size = 'default',
}: AppSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={next => {
        if (next !== null && next !== undefined) onValueChange(String(next));
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          'h-11 min-w-0 justify-between rounded-xl border border-input bg-background px-3.5 text-left text-sm font-medium text-foreground shadow-sm',
          'hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          size === 'compact' && 'h-10 rounded-lg px-3',
          className,
        )}
      >
        <SelectValue placeholder={placeholder ?? 'Chọn...'} />
      </SelectTrigger>
      <SelectContent
        side="bottom"
        sideOffset={6}
        align="start"
        alignItemWithTrigger={false}
        className={cn(
          'z-[80] max-h-[min(20rem,var(--available-height))] min-w-[var(--anchor-width)] rounded-xl border border-border bg-popover p-1 shadow-xl',
          contentClassName,
        )}
      >
        {options.map(option => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              'min-h-10 rounded-lg px-3 py-2 text-sm text-popover-foreground',
              'focus:bg-primary/10 focus:text-primary data-[selected]:bg-primary/10 data-[selected]:font-semibold data-[selected]:text-primary',
              'dark:focus:bg-primary/20 dark:data-[selected]:bg-primary/20',
            )}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
