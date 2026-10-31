'use client';

import { useEffect, useId, useState } from 'react';
import { AppFormDialog } from '@/components/common/app-form-dialog';
import { SchoolActionForm, type SchoolAction } from '@/components/crm/school-action-form';

/** Adapt existing CRM action schemas to the shared dialog without changing API payloads. */
export function SchoolActionDialog({
  action, onClose, save,
}: {
  action: SchoolAction | null;
  onClose: () => void;
  save: (command: { path: string; method?: string; body: Record<string, unknown> }) => Promise<unknown>;
}) {
  const formId = useId();
  const [busy, setBusy] = useState(false);
  // A successful save closes the dialog while the form is still settling.
  // Clear pending state so the next action never inherits a disabled footer.
  useEffect(() => { if (!action) setBusy(false); }, [action]);
  return <AppFormDialog
    open={action !== null}
    onOpenChange={open => { if (!open && !busy) onClose(); }}
    title={action?.title ?? 'Biểu mẫu'}
    description={action?.description || undefined}
    formId={formId}
    busy={busy}
    destructive={action?.danger}
    submitLabel={action?.submitLabel ?? (action?.path === '/school-invitations' ? 'Xác nhận phân bổ' : 'Xác nhận lưu')}
  >
    {action && <SchoolActionForm
      key={action.path + action.title}
      action={action}
      save={save}
      externalSubmit
      formId={formId}
      onBusyChange={setBusy}
    />}
  </AppFormDialog>;
}
