'use client';

import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

/** Controlled VND amount: the UI groups thousands, while value stays unformatted digits. */
export function AppCurrencyInput({
  value, onValueChange, ...props
}: Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange' | 'inputMode'> & {
  value: string;
  onValueChange: (rawDigits: string) => void;
}) {
  const formatted = value ? Number(value).toLocaleString('vi-VN') : '';
  return <Input
    {...props}
    type="text"
    inputMode="numeric"
    autoComplete="off"
    value={formatted}
    onChange={event => {
      const raw = event.target.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '').slice(0, 15);
      onValueChange(raw);
    }}
  />;
}
