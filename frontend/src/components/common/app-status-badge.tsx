import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle, AlertTriangle, CheckCircle2, CircleHelp, Clock3,
  FileClock, Hourglass, LockKeyhole, Scale, ShieldCheck,
  ShieldOff, UnlockKeyhole, UserCheck, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AppStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type StatusVisual = { tone:AppStatusTone; icon:LucideIcon };
const visuals:Record<string,StatusVisual> = {
  // Rights and protection
  PROTECTED:{tone:'success',icon:ShieldCheck},
  ACTIVE:{tone:'success',icon:ShieldCheck},
  APPROVED:{tone:'success',icon:UserCheck},
  COMPLETED:{tone:'success',icon:CheckCircle2},
  CONTINUOUS:{tone:'success',icon:CheckCircle2},
  RELEASED:{tone:'neutral',icon:UnlockKeyhole},
  EXPIRED:{tone:'danger',icon:ShieldOff},
  // Service-interruption assessment
  INTERRUPTED:{tone:'warning',icon:Clock3},
  THRESHOLD_REACHED:{tone:'danger',icon:AlertTriangle},
  EXCEPTION_ACCOUNTING:{tone:'warning',icon:FileClock},
  EXCEPTION_OVERDUE:{tone:'danger',icon:AlertCircle},
  EXCEPTION_DISPUTE:{tone:'danger',icon:Scale},
  EXCEPTION_OWNERSHIP:{tone:'warning',icon:AlertTriangle},
  EXCEPTION_CONFIG_REQUIRED:{tone:'warning',icon:CircleHelp},
  HISTORICALTHRESHOLDREQUIRESREVIEW:{tone:'warning',icon:Clock3},
  MISSINGSERVICETERM:{tone:'warning',icon:CircleHelp},
  NO_SERVICE:{tone:'neutral',icon:CircleHelp},
  // Renewal workflows
  WAITING_RENEWAL:{tone:'warning',icon:FileClock},
  PENDING_MANAGER:{tone:'warning',icon:Hourglass},
  NOT_CREATED:{tone:'info',icon:FileClock},
  NOT_DUE:{tone:'neutral',icon:Clock3},
  REJECTED:{tone:'danger',icon:XCircle},
  SUSPENDED:{tone:'danger',icon:LockKeyhole},
  CANCELLED:{tone:'neutral',icon:XCircle},
};
const toneClasses:Record<AppStatusTone,string> = {
  success:'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200',
  warning:'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200',
  danger:'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-200',
  info:'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-200',
  neutral:'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};

/** Reusable presentation-only badge: server status and permission semantics are unchanged. */
export function AppStatusBadge({status,label,tone,icon:IconOverride,size='md',className}:{
  status:string; label:string; tone?:AppStatusTone; icon?:LucideIcon;
  size?:'sm'|'md'; className?:string;
}) {
  const visual=visuals[status.toUpperCase()] ?? {tone:'neutral',icon:CircleHelp};
  const Icon=IconOverride??visual.icon;
  return <span className={cn(
    'inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold leading-tight',
    size==='sm'?'px-2 py-0.5 text-[11px]':'px-2.5 py-1 text-xs',
    toneClasses[tone??visual.tone],className
  )}>
    <Icon aria-hidden="true" className="size-3.5 shrink-0"/>
    <span className="min-w-0 break-words">{label}</span>
  </span>;
}
