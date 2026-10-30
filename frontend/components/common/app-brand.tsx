import { cn } from '@/lib/utils';

type Props = { compact?: boolean; inverted?: boolean; className?: string };
export function AppBrand({ compact = false, inverted = false, className }: Props) {
  return <div className={cn('flex items-center gap-3', className)}>
    <div className={cn('grid shrink-0 place-items-center overflow-hidden rounded-xl p-1.5',
      inverted ? 'bg-white' : 'bg-[#f0f8f0]')}>
      <img src={process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '/KidsfitCRM/branding/kidsfit-mark.svg' : '/branding/kidsfit-mark.svg'}
        alt="KIDSFIT" width={46} height={42} loading="eager" decoding="async"
        className="h-10 w-11 object-contain" />
    </div>
    {!compact && <div className="min-w-0">
      <p className={cn('text-base font-extrabold tracking-tight', inverted ? 'text-white' : 'text-[#1b5e20]')}>KIDSFIT CRM</p>
      <p className={cn('text-xs', inverted ? 'text-[#b8d3be]' : 'text-muted-foreground')}>Tư duy mở tương lai</p>
    </div>}
  </div>;
}
