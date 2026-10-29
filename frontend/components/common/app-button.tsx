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
};
const tones: Record<Tone, string> = {
  green: 'bg-[#1b5e20] text-white hover:bg-[#124c17] dark:bg-[#81c784] dark:text-[#09220d] dark:hover:bg-[#a5d6a7]',
  orange: 'bg-[#d97706] text-[#111827] hover:bg-[#b45309] hover:text-white dark:bg-[#f59b23] dark:text-[#111827] dark:hover:bg-[#ffb74d]',
  blue: 'bg-[#0369a1] text-white hover:bg-[#075985] dark:bg-[#38bdf8] dark:text-[#082f49] dark:hover:bg-[#7dd3fc]',
  outline: 'border-border bg-background text-foreground hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  danger: 'bg-destructive text-white hover:bg-destructive/90 dark:text-[#0e1912]',
};

export function AppButton({ tone = 'green', busy = false, leadingIcon, className, disabled, children, ...props }: Props) {
  return <Button {...props} variant="outline" disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={cn('crm-brand-button inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-center text-sm font-semibold leading-none align-middle transition-colors [&_svg]:shrink-0', tones[tone],
      (tone === 'outline') && 'border-border', className)}>
    {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : leadingIcon}
    <span className="inline-flex items-center justify-center leading-none">{children}</span>
  </Button>;
}
