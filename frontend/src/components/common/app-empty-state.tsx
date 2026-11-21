import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
type Props = { title: string; description?: string; icon: LucideIcon; action?: ReactNode };
export function AppEmptyState({ title, description, icon: Icon, action }: Props) {
  return <div className="flex min-h-48 flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
    <span className="mb-4 grid size-14 place-items-center rounded-2xl border border-primary/10 bg-primary/10 text-primary"><Icon className="size-6" aria-hidden="true"/></span>
    <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
    {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
