'use client';

import { useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { vi } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { AppNativeSelect } from '@/components/common/app-native-select';

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
};

const pad = (value: number) => String(value).padStart(2, '0');
const parseLocalDateTime = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 ||
      date.getDate() !== day || hour > 23 || minute > 59) return null;
  return { date, hour, minute };
};
const toLocalValue = (date: Date, hour: number, minute: number) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}`;

/** A timezone-neutral Vietnamese wall-clock picker; API UTC conversion remains in workflowFormValue. */
export function AppDateTimePicker({ value, onChange, label, invalid = false, disabled = false, id }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateTime(value);
  const [draftDate, setDraftDate] = useState<Date | undefined>(() => selected?.date);
  const [draftHour, setDraftHour] = useState(() => selected?.hour ?? 9);
  const [draftMinute, setDraftMinute] = useState(() => selected?.minute ?? 0);

  const begin = () => {
    const next = parseLocalDateTime(value);
    setDraftDate(next?.date);
    setDraftHour(next?.hour ?? 9);
    setDraftMinute(next?.minute ?? 0);
    setOpen(true);
  };

  const formatted = selected
    ? `${pad(selected.date.getDate())}/${pad(selected.date.getMonth() + 1)}/${selected.date.getFullYear()} · ${pad(selected.hour)}:${pad(selected.minute)}`
    : 'Chọn ngày và giờ…';

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={
      <button type="button" id={id} aria-label={label} aria-invalid={invalid} disabled={disabled}
        onClick={begin} className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 text-left text-sm text-foreground shadow-xs transition-colors hover:border-[#1b5e20]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5e20] disabled:opacity-50 aria-invalid:border-destructive" />
    }>
      <span className={selected ? 'truncate' : 'truncate text-muted-foreground'}>{formatted}</span>
      <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-[#1b5e20]" />
    </PopoverTrigger>
    <PopoverContent align="end" side="bottom" sideOffset={8}
      className="z-[80] max-h-[min(76dvh,540px)] w-[min(344px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-border bg-popover p-3 shadow-[0_18px_56px_rgba(14,42,26,.25)]">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <span className="font-semibold text-foreground">Chọn ngày và giờ</span>
        <span className="text-xs text-muted-foreground">UTC+7</span>
      </div>
      <Calendar mode="single" selected={draftDate} onSelect={setDraftDate}
        locale={vi} weekStartsOn={1} className="mx-auto w-fit max-w-full"
        classNames={{ day_button: 'rounded-lg', selected: 'bg-[#1b5e20] text-white' }} />
      <div className="border-t border-border pt-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock3 aria-hidden="true" className="size-4 text-[#1b5e20]" />Giờ phản hồi (24 giờ)
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor={(id ?? 'crm-datetime') + '-hour'} className="text-xs font-medium text-muted-foreground">Giờ</label>
            <AppNativeSelect id={(id ?? 'crm-datetime') + '-hour'} containerClassName="w-full"
              value={pad(draftHour)} onChange={event => setDraftHour(Number(event.target.value))}>
              {Array.from({ length: 24 }, (_, hour) =>
                <option value={pad(hour)} key={hour}>{pad(hour)}</option>)}
            </AppNativeSelect>
          </div>
          <div className="space-y-1">
            <label htmlFor={(id ?? 'crm-datetime') + '-minute'} className="text-xs font-medium text-muted-foreground">Phút</label>
            <AppNativeSelect id={(id ?? 'crm-datetime') + '-minute'} containerClassName="w-full"
              value={pad(draftMinute)} onChange={event => setDraftMinute(Number(event.target.value))}>
              {Array.from({ length: 60 }, (_, minute) =>
                <option value={pad(minute)} key={minute}>{pad(minute)}</option>)}
            </AppNativeSelect>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-muted/60 p-2.5 text-center text-sm font-medium">
          {draftDate ? `${pad(draftDate.getDate())}/${pad(draftDate.getMonth()+1)}/${draftDate.getFullYear()} · ${pad(draftHour)}:${pad(draftMinute)}` : 'Chưa chọn ngày'}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
        <Button type="button" disabled={!draftDate} onClick={() => {
          if (!draftDate) return;
          onChange(toLocalValue(draftDate, draftHour, draftMinute));
          setOpen(false);
        }} className="bg-[#1b5e20] text-white hover:bg-[#124c17]">Áp dụng</Button>
      </div>
    </PopoverContent>
  </Popover>;
}
