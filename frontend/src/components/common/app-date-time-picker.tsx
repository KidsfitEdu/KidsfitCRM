'use client';

import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppButton } from '@/components/common/app-button';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { formatLocalDateTime, padDateTime, parseLocalDateTime, toLocalDateTime } from '@/lib/date-time-picker';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
};

/**
 * Compact, keyboard accessible date/time picker for Vietnamese CRM forms.
 * Keep draft edits local until "Áp dụng"; API timezone conversion is performed
 * by workflowFormValue, never by the browser's own UTC offset.
 */
export function AppDateTimePicker({
  value, onChange, label, invalid = false, disabled = false, id,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateTime(value);
  const [draftDate, setDraftDate] = useState<Date | undefined>(() => selected?.date);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => selected?.date ?? new Date());
  const [draftHour, setDraftHour] = useState(() => selected?.hour ?? 9);
  const [draftMinute, setDraftMinute] = useState(() => selected?.minute ?? 0);

  const begin = () => {
    const current = parseLocalDateTime(value);
    const initialDate = current?.date ?? new Date();
    setDraftDate(current?.date);
    setDisplayMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
    setDraftHour(current?.hour ?? 9);
    setDraftMinute(current?.minute ?? 0);
    setOpen(true);
  };

  const formatted = formatLocalDateTime(value);
  const fieldId = id ?? 'crm-datetime';

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={
      <button type="button" id={id} aria-label={label} aria-invalid={invalid} disabled={disabled}
        onClick={begin}
        className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs transition-colors hover:border-[#1b5e20]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5e20] disabled:opacity-50 aria-invalid:border-destructive" />
    }>
      <span className={formatted ? 'truncate' : 'truncate text-muted-foreground'}>{formatted ?? 'Chọn ngày và giờ…'}</span>
      <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#1b5e20]" />
    </PopoverTrigger>

    <PopoverContent align="end" side="top" sideOffset={8}
      className="z-[80] w-[min(312px,calc(100vw-24px))] max-h-[min(84dvh,500px)] overflow-y-auto rounded-2xl border border-border bg-popover p-3 shadow-[0_18px_56px_rgba(14,42,26,.24)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-1 pb-3">
        <span className="text-sm font-semibold text-foreground">Chọn ngày và giờ</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">UTC+7</span>
      </div>

      {/* DayPicker's absolutely positioned nav overlapped the heading. Give month
          navigation its own row and visually hide the internal caption/nav. */}
      <div className="mt-2 grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-2" aria-label="Điều hướng tháng">
        <button type="button" aria-label="Tháng trước"
          className="inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5e20]"
          onClick={() => setDisplayMonth(month => new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span aria-live="polite" className="min-w-0 text-center text-sm font-semibold capitalize text-foreground">
          {format(displayMonth, 'LLLL yyyy', { locale: vi })}
        </span>
        <button type="button" aria-label="Tháng sau"
          className="inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5e20]"
          onClick={() => setDisplayMonth(month => new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <Calendar
        mode="single"
        selected={draftDate}
        month={displayMonth}
        onMonthChange={setDisplayMonth}
        onSelect={date => {
          setDraftDate(date);
          if (date) setDisplayMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        }}
        hideNavigation
        locale={vi}
        weekStartsOn={1}
        showOutsideDays={false}
        className="mx-auto mt-1 w-fit max-w-full p-0 [--cell-size:2rem] [&_[data-selected-single=true]]:!rounded-full [&_[data-selected-single=true]]:!bg-[#1b5e20] [&_[data-selected-single=true]]:!text-white"
        classNames={{
          month: 'flex w-full flex-col gap-2',
          months: 'flex flex-col gap-0',
          month_caption: 'sr-only',
          week: 'mt-1 flex w-full',
          day_button: 'rounded-full',
          day: 'group/day relative aspect-square h-full w-full rounded-full p-0 text-center',
          today: 'rounded-full bg-muted/60 text-foreground',
        }}
      />

      <div className="mt-2 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
          <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
          <span>Thời gian</span>
        </div>
        <div className="flex w-full items-center justify-center gap-2">
          <AppNativeSelect id={fieldId + '-hour'} aria-label="Giờ (24 giờ)"
            containerClassName="h-10 w-24 shrink-0" className="pl-3 pr-9 text-center tabular-nums"
            value={padDateTime(draftHour)} onChange={event => setDraftHour(Number(event.target.value))}>
            {Array.from({ length: 24 }, (_, hour) =>
              <option value={padDateTime(hour)} key={hour}>{padDateTime(hour)}</option>)}
          </AppNativeSelect>
          <span className="text-base font-semibold text-muted-foreground" aria-hidden="true">:</span>
          <AppNativeSelect id={fieldId + '-minute'} aria-label="Phút"
            containerClassName="h-10 w-24 shrink-0" className="pl-3 pr-9 text-center tabular-nums"
            value={padDateTime(draftMinute)} onChange={event => setDraftMinute(Number(event.target.value))}>
            {Array.from({ length: 60 }, (_, minute) =>
              <option value={padDateTime(minute)} key={minute}>{padDateTime(minute)}</option>)}
          </AppNativeSelect>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
        <AppButton type="button" tone="neutral" className="h-9 min-w-20" onClick={() => setOpen(false)}>Hủy</AppButton>
        <AppButton type="button" tone="green" className="h-9 min-w-20" disabled={!draftDate}
          onClick={() => {
            if (!draftDate) return;
            onChange(toLocalDateTime(draftDate, draftHour, draftMinute));
            setOpen(false);
          }}>Áp dụng</AppButton>
      </div>
    </PopoverContent>
  </Popover>;
}
