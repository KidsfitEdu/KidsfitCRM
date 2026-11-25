'use client';

import { useEffect, useId, useState } from 'react';
import { AppFormDialog } from '@/components/common/dialogs/app-form-dialog';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { SchoolActionForm, type SchoolAction } from '@/components/crm/schools/school-action-form';

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
  const noFields = action !== null && action.fields.length === 0;
  const actionForm = action && <SchoolActionForm
    key={action.path + action.title}
    action={action}
    save={save}
    externalSubmit
    formId={formId}
    onBusyChange={setBusy}
  />;

  if (noFields) {
    return <ConfirmDialog
      open={true}
      busy={busy}
      onOpenChange={open => { if (!open && !busy) onClose(); }}
      title={action.title === 'Nhận trường' ? 'Xác nhận nhận trường' : action.title}
      description={<>
        {action.subject && <>Bạn có chắc chắn muốn nhận phân bổ trường <strong>{action.subject}</strong>? </>}
        {action.description}
      </>}
      confirmLabel={action.submitLabel ?? (action.preset?.accept === true ? 'Xác nhận nhận' : 'Xác nhận')}
      destructive={action.danger}
      onConfirm={() => {
        const form = document.getElementById(formId);
        if (form instanceof HTMLFormElement) form.requestSubmit();
      }}
    >
      {actionForm}
    </ConfirmDialog>;
  }

  return <AppFormDialog
    open={action !== null}
    onOpenChange={open => { if (!open && !busy) onClose(); }}
    title={action?.title ?? 'Biểu mẫu'}
    description={action?.description || undefined}
    formId={formId}
    busy={busy}
    compact={action?.fields.length === 1 && action.fields[0]?.type === 'textarea'}
    destructive={action?.danger}
    submitLabel={action?.submitLabel ?? (action?.path === '/school-invitations' ? 'Xác nhận phân bổ' : 'Xác nhận lưu')}
  >
    {actionForm}
  </AppFormDialog>;
}
