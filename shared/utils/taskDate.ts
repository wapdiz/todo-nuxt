export function getLocalDate(date = new Date()): string {
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date');

  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function isTaskDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseTaskDate(value: string): Date | null {
  if (!isTaskDate(value)) return null;

  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);

  return date;
}

export function shiftTaskDate(value: string, offsetDays: number): string | null {
  const date = parseTaskDate(value);
  if (!date || !Number.isInteger(offsetDays)) return null;
  date.setDate(date.getDate() + offsetDays);
  return getLocalDate(date);
}
