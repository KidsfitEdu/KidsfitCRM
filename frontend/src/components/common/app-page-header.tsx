import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function AppPageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3 py-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-primary">{eyebrow}</p>}
        <h2 className="break-words text-[clamp(1.5rem,2.4vw,1.875rem)] font-bold leading-tight tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </section>
  );
}
