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

/**
 * The transaction form selects a calendar date, not a time of day.
 * Today's transaction must not be submitted as noon when it is still morning:
 * the backend rejects received_at/paid_at values in the future.
 * For previous days, use local noon in Vietnam to avoid date rollover.
 */
export function accountingTransactionTimestamp(date: string, now: Date = new Date()): string {
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return date === today ? now.toISOString() : new Date(`${date}T12:00:00+07:00`).toISOString();
}
