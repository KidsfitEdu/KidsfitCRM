import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
type Props = { title: string; description?: string; icon: LucideIcon; action?: ReactNode };
export function AppEmptyState({ title, description, icon: Icon, action }: Props) {
  return <div className="flex min-h-44 flex-col items-center justify-center px-5 py-10 text-center">
    <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Icon className="size-6" aria-hidden="true"/></span>
    <h3 className="text-sm font-semibold">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
