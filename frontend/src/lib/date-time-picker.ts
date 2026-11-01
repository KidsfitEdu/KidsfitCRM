/** Vietnam wall-clock values used by CRM forms (YYYY-MM-DDTHH:mm). */
export const padDateTime = (value: number) => String(value).padStart(2, '0');

export function parseLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  // Build the calendar date in the browser's zone, but never use its timezone for submission.
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 ||
      date.getDate() !== day) return null;
  return { date, hour, minute };
}

export function toLocalDateTime(date: Date, hour: number, minute: number) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 59 ||
      Number.isNaN(date.getTime())) throw new Error('Ngày giờ không hợp lệ.');
  return `${date.getFullYear()}-${padDateTime(date.getMonth() + 1)}-${padDateTime(date.getDate())}T${padDateTime(hour)}:${padDateTime(minute)}`;
}

export function formatLocalDateTime(value: string) {
  const parsed = parseLocalDateTime(value);
  if (!parsed) return null;
  const { date, hour, minute } = parsed;
  return `${padDateTime(date.getDate())}/${padDateTime(date.getMonth() + 1)}/${date.getFullYear()} · ${padDateTime(hour)}:${padDateTime(minute)}`;
}
