// Management reports (SRS 4.5, 14.1–14.4, 14.7, 14.8): pure shaping of GET /reports/summary for display.
// Not included until VECV approves them: SLA/ageing (14.5), audit trail (14.6), closure review (14.9).
import type { ReportSummary } from '../../api/types';
import { fromPortalStatus, portalStatusLabel, statusBucket, statusTone, type StatusTone } from '../../domain/case-status';
import { displayText } from '../../domain/display';
import { isoDate } from '../cases/filters';

export type ReportPeriod = '30d' | '90d' | 'all';

export const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];

const PERIOD_DAYS: Record<ReportPeriod, number | null> = { '30d': 30, '90d': 90, all: null };

/** `from` date for the report query; undefined means no lower bound. */
export function periodFrom(period: ReportPeriod, now = new Date()): string | undefined {
  const days = PERIOD_DAYS[period];
  return days ? isoDate(new Date(now.getTime() - days * 86_400_000)) : undefined;
}

export type BarRow = { key: string; label: string; value: number };

/** A count from the API as display text; anything that isn't a number reads as a dash, never NaN/null. */
export const displayCount = (n: unknown): string => (typeof n === 'number' && Number.isFinite(n) ? String(n) : '–');

const safe = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

/** Largest categories first; the rest fold into "Other categories" so the card stays short (14.2). */
export function categoryRows(rows: ReportSummary['byCategory'], max = 5): BarRow[] {
  const sorted = rows
    .map(r => ({ key: r.caseTypeId, label: displayText(r.label), value: safe(r.count) }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1);
  const other = sorted.slice(max - 1).reduce((sum, r) => sum + r.value, 0);
  return [...head, { key: 'other', label: 'Other categories', value: other }];
}

export type StatusRow = BarRow & { tone: StatusTone };

/**
 * Open cases by status (14.3), labelled with the app's status names. Closed statuses are left out,
 * unknown values group under "Under Review", and portal statuses that share a label are merged.
 */
export function openStatusRows(rows: ReportSummary['byStatus']): StatusRow[] {
  const out = new Map<string, StatusRow>();
  for (const r of rows) {
    const status = fromPortalStatus(r.status);
    if (status && statusBucket(status) === 'closed') continue;
    const label = portalStatusLabel(r.status);
    const prev = out.get(label);
    const value = safe(r.count) + (prev?.value ?? 0);
    out.set(label, { key: status ?? 'unknown', label, value, tone: statusTone(status) });
  }
  return [...out.values()].filter(r => r.value > 0);
}

/** Rating distribution from 5 stars down to 1, with missing ratings as zero (14.7). */
export function ratingRows(distribution: ReportSummary['feedback']['distribution']): { rating: number; count: number }[] {
  return [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: distribution.filter(d => d.rating === rating).reduce((sum, d) => sum + safe(d.count), 0),
  }));
}

/** Average rating to one decimal; no ratings yet reads as a dash. */
export function displayAverage(avg: number | null | undefined): string {
  return typeof avg === 'number' && Number.isFinite(avg) ? avg.toFixed(1) : '–';
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
