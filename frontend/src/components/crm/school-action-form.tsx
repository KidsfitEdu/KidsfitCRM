'use client';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { workflowFormValue } from '@/lib/school-operations';
import { AppCombobox } from '@/components/common/app-combobox';

export type SchoolActionField = {
  name: string;
  label: string;
  type?:
    | 'text'
    | 'textarea'
    | 'number'
    | 'datetime-local'
    | 'email'
    | 'boolean'
    | 'select';
  optional?: boolean;
  value?: string;
  options?: { value: string; label: string }[];
  hint?: string;
};
export type SchoolAction = {
  title: string;
  description: string;
  path: string;
  method?: string;
  fields: SchoolActionField[];
  preset?: Record<string, unknown>;
  submitLabel?: string;
  danger?: boolean;
  prepare?: (body: Record<string, unknown>) => Record<string, unknown>;
};
export function SchoolActionForm({
  action,
  save,
  inline = false,
  externalSubmit = false,
  formId,
  onBusyChange,
}: {
  action: SchoolAction;
  inline?: boolean;
  externalSubmit?: boolean;
  formId?: string;
  onBusyChange?: (busy: boolean) => void;
  save: (command: {
    path: string;
    method?: string;
    body: Record<string, unknown>;
  }) => Promise<unknown>;
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const shape = Object.fromEntries(
    action.fields.map((field) => [
      field.name,
      field.optional
        ? z.string().trim()
        : z
            .string()
            .trim()
            .min(1, 'Cần nhập ' + field.label.toLocaleLowerCase('vi') + '.'),
    ]),
  );
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(z.object(shape)),
    defaultValues: Object.fromEntries(
      action.fields.map((field) => [field.name, field.value ?? '']),
    ),
  });
  useEffect(() => { onBusyChange?.(form.formState.isSubmitting); }, [form.formState.isSubmitting, onBusyChange]);
  return (
    <>
      {externalSubmit ? null : inline ? (
        <>
          <h3 className="font-semibold">{action.title}</h3>
          {action.description && <p className="text-sm text-muted-foreground">{action.description}</p>}
        </>
      ) : (
        <>
          <DialogTitle>{action.title}</DialogTitle>
          {action.description && <DialogDescription>{action.description}</DialogDescription>}
        </>
      )}
      <form
        id={formId}
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError('');
          try {
            const body: Record<string, unknown> = {
              ...action.preset,
              idempotency_key: key,
            };
            for (const field of action.fields)
              body[field.name] = workflowFormValue(
                field.type ?? 'text',
                values[field.name] ?? '',
                field.optional,
              );
            await save({
              path: action.path,
              method: action.method,
              body: action.prepare ? action.prepare(body) : body,
            });
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'Không thể lưu thay đổi.',
            );
          }
        })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {action.fields.map((field) => (
            <label
              key={field.name}
              className={
                'space-y-1.5 text-sm' +
                (field.type === 'textarea' ? ' sm:col-span-2' : '')
              }
            >
              <span className="font-medium">
                {field.label}
                {field.optional ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (tùy chọn)
                  </span>
                ) : (
                  ' *'
                )}
              </span>
              {field.options ? (
                <Controller
                  name={field.name}
                  control={form.control}
                  render={({ field: control }) => (
                    <AppCombobox
                      options={field.options ?? []}
                      value={control.value ?? ''}
                      onChange={control.onChange}
                      ariaLabel={field.label}
                      invalid={!!form.formState.errors[field.name]}
                      placeholder={'Tìm và chọn ' + field.label.toLocaleLowerCase('vi') + '…'}
                    />
                  )}
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  {...form.register(field.name)}
                  rows={3}
                  maxLength={4000}
                  className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-[#1b5e20]"
                />
              ) : (
                <Input
                  {...form.register(field.name)}
                  type={
                    field.type === 'boolean' ? 'text' : (field.type ?? 'text')
                  }
                  step={field.type === 'number' ? 1 : undefined}
                  autoComplete="off"
                  className="h-11 rounded-xl"
                />
              )}
              {field.type === 'datetime-local' && (
                <span className="block text-xs text-muted-foreground">
                  Giờ Việt Nam (UTC+7)
                </span>
              )}
              {field.hint && (
                <span className="block text-xs text-muted-foreground">
                  {field.hint}
                </span>
              )}
              {form.formState.errors[field.name] && (
                <span role="alert" className="block text-xs text-red-600">
                  {form.formState.errors[field.name]?.message}
                </span>
              )}
            </label>
          ))}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {!externalSubmit && <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          variant={action.danger ? 'destructive' : 'default'}
          className="h-11 w-full bg-[#1b5e20] text-white hover:bg-[#124c17]"
        >
          {form.formState.isSubmitting
            ? 'Đang lưu…'
            : (action.submitLabel ?? 'Xác nhận lưu')}
        </Button>}
      </form>
    </>
  );
}
