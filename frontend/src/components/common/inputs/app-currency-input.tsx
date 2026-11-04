'use client';

import { useLayoutEffect, useRef, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type CurrencyInputProps = Omit<
  ComponentProps<typeof Input>,
  'ref' | 'type' | 'value' | 'onChange' | 'inputMode'
> & {
  value: string;
  onValueChange: (rawDigits: string) => void;
};

/**
 * Controlled VND input. Store digits only; display grouped thousands.
 * Preserve the caret's position relative to digits when grouping separators
 * are inserted/removed, so typing or editing in the middle does not shift it.
 */
export function AppCurrencyInput({ value, onValueChange, ...props }: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretDigits = useRef<number | null>(null);
  const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  useLayoutEffect(() => {
    const digitsBeforeCaret = pendingCaretDigits.current;
    if (digitsBeforeCaret === null) return;
    pendingCaretDigits.current = null;

    const input = inputRef.current;
    if (!input || document.activeElement !== input) return;
    let offset = 0;
    let digits = 0;
    while (offset < formatted.length && digits < digitsBeforeCaret) {
      if (/\d/.test(formatted[offset])) digits++;
      offset++;
    }
    input.setSelectionRange(offset, offset);
  }, [formatted]);

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={formatted}
      onChange={event => {
        const typed = event.currentTarget.value;
        const digits = typed.replace(/[^0-9]/g, '');
        const normalized = digits.replace(/^0+(?=\d)/, '').slice(0, 15);
        const digitsToCaret = typed.slice(0, event.currentTarget.selectionStart ?? typed.length)
          .replace(/[^0-9]/g, '').length;
        const trimmedZeros = digits.length - digits.replace(/^0+(?=\d)/, '').length;
        pendingCaretDigits.current = Math.min(normalized.length, Math.max(0, digitsToCaret - trimmedZeros));
        onValueChange(normalized);
      }}
    />
  );
}
