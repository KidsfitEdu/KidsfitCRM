'use client';

import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type CurrencyInputProps = Omit<
  ComponentProps<typeof Input>,
  'ref' | 'type' | 'value' | 'onChange' | 'inputMode'
> & {
  value: string;
  onValueChange: (rawDigits: string) => void;
};

/**
 * Keep the numeric string unformatted while editing so typing, replacing,
 * and deleting digits never changes the caret position unexpectedly.
 * Format VND thousands only after focus leaves the field.
 */
export function AppCurrencyInput({
  value,
  onValueChange,
  onFocus,
  onBlur,
  ...props
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={focused ? value : formatted}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
      onChange={event => {
        const digits = event.currentTarget.value.replace(/[^0-9]/g, '');
        onValueChange(digits.replace(/^0+(?=\d)/, '').slice(0, 15));
      }}
    />
  );
}
