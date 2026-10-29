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
    <section className={cn('crm-brand-surface rounded-2xl border border-border/80 bg-card p-5 transition-shadow hover:shadow-[0_12px_32px_rgba(14,42,26,.10)]', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-5 text-muted-foreground sm:text-sm">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e8f5e9] text-[#1b5e20] dark:bg-[#24432b] dark:text-[#a5d6a7]">
          <Icon className="size-4" aria-hidden="true"/>
        </span>
      </div>
      <p className="mt-3 text-[26px] font-bold tracking-tight text-foreground tabular-nums">{value == null ? '—' : typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </section>
  );
}
