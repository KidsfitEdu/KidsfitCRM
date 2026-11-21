import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string | number | null | undefined;
  description?: string;
  icon: LucideIcon;
  className?: string;
};
export function AppStatCard({ label, value, description, icon: Icon, className }: Props) {
  return (
    <section className={cn('crm-brand-surface flex min-h-[136px] min-w-0 flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 transition-shadow sm:p-5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-5 text-muted-foreground sm:text-sm">{label}</p>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true"/>
        </span>
      </div>
      <p className="mt-3 break-words text-[clamp(1.45rem,2.4vw,1.875rem)] font-bold leading-tight tracking-tight text-foreground tabular-nums">{value == null ? '—' : typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </section>
  );
}
