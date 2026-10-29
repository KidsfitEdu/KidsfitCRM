'use client';

import type { ComponentProps, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tone = 'green' | 'orange' | 'blue' | 'outline' | 'ghost' | 'danger';
type Props = Omit<ComponentProps<typeof Button>, 'variant'> & {
  tone?: Tone;
  busy?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  premium?: boolean;
};
const tones: Record<Tone, string> = {
  green: 'bg-[#1b5e20] text-white hover:bg-[#124c17] hover:text-white dark:bg-[#1b5e20] dark:text-white dark:hover:bg-[#124c17] dark:hover:text-white',
  orange: 'bg-[#b45309] text-white hover:bg-[#92400e] hover:text-white dark:bg-[#b45309] dark:text-white dark:hover:bg-[#92400e] dark:hover:text-white',
  blue: 'bg-[#0369a1] text-white hover:bg-[#075985] hover:text-white dark:bg-[#0369a1] dark:text-white dark:hover:bg-[#075985] dark:hover:text-white',
  outline: 'border-border bg-background text-foreground hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  danger: 'bg-destructive text-white hover:bg-destructive/90 dark:text-white',
};

export function AppButton({ tone = 'green', busy = false, leadingIcon, trailingIcon, premium = false, className, disabled, children, ...props }: Props) {
  return <Button {...props} variant="outline" disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={cn('crm-brand-button inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-center text-sm font-semibold leading-none align-middle transition-colors [&_svg]:shrink-0', tones[tone],
      premium && 'rounded-lg font-bold shadow-[0_6px_16px_rgba(14,42,26,.14)] hover:-translate-y-px hover:shadow-[0_9px_20px_rgba(14,42,26,.19)] active:translate-y-0',
      (tone === 'outline') && 'border-border', className)}>
    {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : leadingIcon}
    <span className="inline-flex items-center justify-center leading-none">{children}</span>
    {!busy && trailingIcon}
  </Button>;
}
