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
  orange: 'bg-[#d97706] text-white hover:bg-[#b45309] hover:text-white dark:bg-[#d97706] dark:text-white dark:hover:bg-[#b45309] dark:hover:text-white',
  blue: 'bg-[#0369a1] text-white hover:bg-[#075985] hover:text-white dark:bg-[#0369a1] dark:text-white dark:hover:bg-[#075985] dark:hover:text-white',
  outline: 'border border-[#a5d6a7] bg-card text-[#1b5e20] hover:bg-[#1b5e20] hover:text-white dark:border-[#81c784] dark:bg-card dark:text-[#a5d6a7] dark:hover:bg-[#1b5e20] dark:hover:text-white',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  danger: 'border border-transparent bg-[#be123c] text-white hover:bg-[#9f1239] hover:text-white dark:bg-[#be123c] dark:text-white',
};

export function AppButton({ tone = 'green', busy = false, leadingIcon, trailingIcon, premium = false, className, disabled, children, ...props }: Props) {
  return <Button {...props} variant="outline" disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={cn('crm-brand-button inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-center text-sm font-semibold leading-none align-middle transition-colors [&_svg]:shrink-0', tones[tone],
      premium && 'rounded-lg font-bold shadow-[0_6px_16px_rgba(14,42,26,.14)] hover:-translate-y-px hover:shadow-[0_9px_20px_rgba(14,42,26,.19)] active:translate-y-0',
      (tone === 'outline') && 'border-border', className)}>
    {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : leadingIcon}
    {children != null && <span className="inline-flex items-center justify-center leading-none">{children}</span>}
    {!busy && trailingIcon}
  </Button>;
}
