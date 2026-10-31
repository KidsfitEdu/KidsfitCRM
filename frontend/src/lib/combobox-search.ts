/** Accent-insensitive matching for Vietnamese CRM combobox labels. */
export function normalizeComboboxText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi')
    .trim();
}

export function matchesComboboxQuery(label: string, query: string): boolean {
  return normalizeComboboxText(label).includes(normalizeComboboxText(query));
}
