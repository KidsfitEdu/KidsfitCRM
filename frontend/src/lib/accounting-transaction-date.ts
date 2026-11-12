/** Compare CRM business calendar days without converting a DateOnly value into a timestamp. */
export function contractSignedDay(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T)/.exec(value);
  return match?.[1] ?? null;
}

export function validateTransactionDay(
  date: string,
  today: string,
  signedOn: string,
  entryMode: 'receipt' | 'payout',
): string | undefined {
  if (!date) return 'Vui lòng chọn ngày giao dịch.';
  if (date > today) return 'Ngày giao dịch không được lớn hơn ngày hiện tại.';
  if (entryMode === 'receipt' && date < signedOn)
    return 'Ngày thu không được trước ngày ký hợp đồng.';
  return undefined;
}
