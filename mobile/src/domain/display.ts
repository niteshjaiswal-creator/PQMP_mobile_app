// Business-readable rendering of backend values (SRS 9.3 Data Display Rules, 11.9, 18.5).
// Screens must never show raw null/undefined/blank values, invalid SAP dates or technical codes.

export const FALLBACK = {
  notAvailable: 'Not Available',
  awaitingUpdate: 'Awaiting Update',
  temporarilyUnavailable: 'Temporarily Unavailable',
  trackingUnavailable: 'Tracking Unavailable',
} as const;

type Raw = string | number | null | undefined;

const isBlank = (value: Raw): value is null | undefined | '' =>
  value == null || (typeof value === 'string' && ['', 'null', 'undefined', 'nan'].includes(value.trim().toLowerCase()));

/** Free text such as remarks or descriptions. */
export function displayText(value: Raw, fallback: string = FALLBACK.notAvailable): string {
  return isBlank(value) ? fallback : String(value).trim();
}

/** Quantities: blank is "Not Available" unless the backend explicitly confirmed zero (9.3.4). */
export function displayQuantity(value: Raw): string {
  if (isBlank(value)) return FALLBACK.notAvailable;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) ? String(n) : FALLBACK.notAvailable;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Parses the date shapes seen from PQMP/ECC: ISO strings, YYYY-MM-DD, SAP YYYYMMDD and DD.MM.YYYY.
 * Returns null for blanks and SAP "zero" dates (0000-00-00, 00000000, 00.00.0000).
 */
export function parseBackendDate(value: Raw): Date | null {
  if (isBlank(value)) return null;
  const s = String(value).trim();
  if (/^0+[-./]?0+[-./]?0+/.test(s)) return null;

  let y: number, m: number, d: number;
  let match: RegExpMatchArray | null;
  if ((match = s.match(/^(\d{4})(\d{2})(\d{2})$/))) [y, m, d] = [+match[1], +match[2], +match[3]];
  else if ((match = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/))) [y, m, d] = [+match[3], +match[2], +match[1]];
  else if ((match = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) [y, m, d] = [+match[1], +match[2], +match[3]];
  else return null;

  // Date silently rolls 2026-02-30 over to 2 Mar; treat that as invalid instead.
  const day = new Date(y, m - 1, d);
  if (y < 1900 || day.getFullYear() !== y || day.getMonth() !== m - 1 || day.getDate() !== d) return null;
  if (s.length <= 10) return day; // date only: keep local midnight, avoids UTC day shift
  const withTime = new Date(s);
  return Number.isNaN(withTime.getTime()) ? null : withTime;
}

/** Dates: invalid or empty becomes "Awaiting Update" (9.3.3). Format: 12 Mar 2026. */
export function displayDate(value: Raw): string {
  const date = parseBackendDate(value);
  return date ? `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}` : FALLBACK.awaitingUpdate;
}

export function displayDateTime(value: Raw): string {
  const date = parseBackendDate(value);
  return date ? `${displayDate(value)}, ${pad(date.getHours())}:${pad(date.getMinutes())}` : FALLBACK.awaitingUpdate;
}

/** Shown wherever backend order, part or tracking data is displayed (9.3.8). */
export function displayLastRefreshed(value: Raw): string {
  const date = parseBackendDate(value);
  return `Last refreshed: ${date ? displayDateTime(value) : FALLBACK.notAvailable}`;
}
