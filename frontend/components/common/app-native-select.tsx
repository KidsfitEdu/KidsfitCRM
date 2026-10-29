'use client';

import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppNativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  /** Outer control classes, including width and height. */
  containerClassName?: string;
};

/** Accessible native select with a single, centered KIDSFIT dropdown chevron. */
export function AppNativeSelect({ containerClassName, className, children, disabled, ...props }: AppNativeSelectProps) {
  return (
    <div className={cn(
      'relative inline-flex h-11 min-w-0 items-center rounded-xl border border-input bg-background text-foreground shadow-sm',
      'transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
      disabled && 'cursor-not-allowed opacity-50',
      containerClassName,
    )}>
      <select
        {...props}
        disabled={disabled}
        className={cn(
          'h-full w-full min-w-0 cursor-pointer appearance-none rounded-[inherit] bg-transparent',
          'py-2 pl-3.5 pr-11 text-sm leading-5 outline-none disabled:cursor-not-allowed',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
