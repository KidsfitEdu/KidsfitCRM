'use client';
import type { FormEvent, ReactNode } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/common/app-button';
import { Input } from '@/components/ui/input';

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  placeholder?: string;
  countLabel?: string;
  searchLabel?: string;
  filters?: ReactNode;
};
export function AppTableToolbar({ value, onValueChange, onSearch, onReset, placeholder = 'Tìm kiếm...', countLabel, searchLabel = 'Tìm kiếm danh sách', filters }: Props) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSearch(); };
  return (
    <div className="flex flex-col gap-3 border-b border-border/80 p-4 sm:px-5">
      <form onSubmit={submit} role="search" className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <Input aria-label={searchLabel}
            className="h-10 rounded-xl bg-background pl-9"
            placeholder={placeholder} value={value} onChange={e => onValueChange(e.target.value)}/>
        </div>
        {filters}
        <AppButton type="submit" tone="orange" premium size="lg" className="h-10 rounded-lg">Tìm kiếm</AppButton>
        <AppButton type="button" tone="outline" size="icon-lg" className="h-10 w-10 rounded-lg border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground" aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" leadingIcon={<RotateCcw className="size-4"/>} onClick={onReset}/>
      </form>
      {countLabel && <p className="text-right text-xs text-muted-foreground" aria-live="polite">{countLabel}</p>}
    </div>
  );
}
