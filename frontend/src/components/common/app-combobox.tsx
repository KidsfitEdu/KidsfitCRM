'use client';

import {
  Combobox, ComboboxInput, ComboboxContent, ComboboxList,
  ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox';

export type AppComboboxOption = { value: string; label: string };

type Props = {
  options: AppComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  name?: string;
  id?: string;
  ariaLabel?: string;
};

/** Searchable single-select. Uses Base UI's keyboard navigation, focus and popup positioning. */
export function AppCombobox({
  options, value, onChange, placeholder = 'Tìm và chọn…',
  disabled = false, invalid = false, name, id, ariaLabel,
}: Props) {
  const items = options.map(option => option.value);
  const labelFor = (item: string) => options.find(option => option.value === item)?.label ?? item;

  return <Combobox items={items} itemToStringLabel={labelFor} value={value || null}
    onValueChange={next => onChange(next ?? '')} disabled={disabled}>
    <ComboboxInput
      id={id}
      name={name}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      placeholder={placeholder}
      showTrigger
      className="h-11 w-full rounded-xl border border-input bg-background text-sm shadow-xs focus-within:border-[#1b5e20] focus-within:ring-2 focus-within:ring-[#1b5e20]/15"
    />
    <ComboboxContent className="z-[70] rounded-xl border border-border bg-popover shadow-xl">
      <ComboboxEmpty>Không tìm thấy lựa chọn phù hợp.</ComboboxEmpty>
      <ComboboxList className="max-h-64 overflow-y-auto p-1.5">
        {options.map(option =>
          <ComboboxItem key={option.value} value={option.value}
            className="min-h-10 rounded-lg px-3 py-2 text-sm">
            {option.label}
          </ComboboxItem>
        )}
      </ComboboxList>
    </ComboboxContent>
  </Combobox>;
}
