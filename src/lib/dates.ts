/**
 * Calendar dates, always local.
 *
 * `Session.date` is a local "YYYY-MM-DD". Calgary is UTC-7, so
 * `new Date().toISOString().slice(0, 10)` returns TOMORROW for any class after
 * 5pm. That would file an evening session under the wrong day and break
 * "Export today". Nothing in this file may use toISOString for a calendar date.
 */

/** Local calendar date as "YYYY-MM-DD". */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return localDateString();
}

/** Parses "YYYY-MM-DD" into a Date at local midnight. */
export function fromDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Days offset from today as "YYYY-MM-DD". `addDays(-1)` is yesterday. */
export function addDays(days: number, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

/** Monday of the week containing `from`, as "YYYY-MM-DD". */
export function startOfWeek(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  // getDay(): 0 = Sunday. Shift so Monday starts the week.
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return localDateString(d);
}

/** "Fri 20 Nov" for list rows and card meta. */
export function formatDateShort(s: string): string {
  return fromDateString(s).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** "Monday 23 November" for the live class scoreboard. */
export function formatDateLong(s: string): string {
  return fromDateString(s).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** "10:14" for entry rows, from an epoch timestamp. */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
}

/** Inclusive test for a "YYYY-MM-DD" date inside a range. Lexical compare is
    safe because the format is fixed-width and zero-padded. */
export function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}
