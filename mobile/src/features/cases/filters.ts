// My Cases filters (LIST-03, LIST-04, DASH-04): state, dashboard presets and the API query.
// Management report tiles (SRS 14.1, 14.4, 14.7) drill down through the same presets.
import type { CaseListQuery, PortalStatus } from '../../api/types';
import type { CasePreset } from '../../navigation/types';

export type DateRange = 'any' | '7d' | '30d' | '90d';

export type CaseFilters = {
  statusGroup: 'open' | 'closed' | 'all';
  statuses: PortalStatus[];
  caseTypeId?: string;
  subTypeId?: string;
  priority?: string;
  dateRange: DateRange;
  orderRelated: boolean;
  needsAction?: 'reply' | 'feedback';
  /** Open cases with an order/part/EDA update in the last 7 days (home "order and delivery updates", DASH-04). */
  orderUpdated?: boolean;
  /** Open cases with order or part quantities still pending (SRS 14.4, management reports). */
  pendingOrder?: boolean;
  /** Cases updated since the start of today (SRS 14.1). */
  updatedToday?: boolean;
  /** Closed cases rated at or below this value (low-rating cases, SRS 14.7). */
  maxRating?: number;
  /** Internal roles: open cases older than the old/pending threshold (SRS 10.4, 13.2). */
  assignment?: 'old_pending';
};

export const DEFAULT_FILTERS: CaseFilters = { statusGroup: 'open', statuses: [], dateRange: 'any', orderRelated: false };

/** Status values a user can pick, in lifecycle order (portal statuses, SRS 10.1). */
export const FILTER_STATUSES: PortalStatus[] = ['New', 'Assigned', 'In Progress', 'Hold', 'Escalated', 'Re-Open', 'Close'];

/** Priority value the reports count as "high priority" (portal `priority` master). */
export const HIGH_PRIORITY = 'P1';
/** Ratings at or below this count as low (SRS 14.7). TODO(VECV): confirm the threshold. */
export const LOW_RATING_MAX = 2;

export function filtersForPreset(preset: CasePreset | undefined): CaseFilters {
  switch (preset) {
    case 'closed': return { ...DEFAULT_FILTERS, statusGroup: 'closed' };
    case 'all': return { ...DEFAULT_FILTERS, statusGroup: 'all' };
    case 'inProgress': return { ...DEFAULT_FILTERS, statuses: ['In Progress', 'Resume'] };
    case 'reply': return { ...DEFAULT_FILTERS, needsAction: 'reply' };
    case 'feedback': return { ...DEFAULT_FILTERS, statusGroup: 'closed', needsAction: 'feedback' };
    case 'orderRelated': return { ...DEFAULT_FILTERS, orderRelated: true };
    case 'orderUpdates': return { ...DEFAULT_FILTERS, orderUpdated: true };
    case 'pendingOrder': return { ...DEFAULT_FILTERS, pendingOrder: true };
    case 'updatedToday': return { ...DEFAULT_FILTERS, statusGroup: 'all', updatedToday: true };
    case 'highPriority': return { ...DEFAULT_FILTERS, priority: HIGH_PRIORITY };
    case 'lowRating': return { ...DEFAULT_FILTERS, statusGroup: 'closed', maxRating: LOW_RATING_MAX };
    case 'oldPending': return { ...DEFAULT_FILTERS, assignment: 'old_pending' };
    default: return DEFAULT_FILTERS;
  }
}

/** Number of filters beyond the status group, for the filter button badge. */
export function activeFilterCount(f: CaseFilters): number {
  return [f.statuses.length > 0, !!f.caseTypeId, !!f.subTypeId, !!f.priority, f.dateRange !== 'any', f.orderRelated, !!f.needsAction, !!f.orderUpdated, !!f.pendingOrder, !!f.updatedToday, f.maxRating != null, !!f.assignment].filter(Boolean).length;
}

const DAYS: Record<DateRange, number | null> = { any: null, '7d': 7, '30d': 30, '90d': 90 };

/** Local calendar date as `YYYY-MM-DD`, the API's date format. */
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function toQuery(f: CaseFilters, search: string, now = new Date()): CaseListQuery {
  const days = DAYS[f.dateRange];
  const term = search.trim();
  // Statuses inside a group: a status chip overrides the open/closed group (search all).
  const statusGroup = f.statuses.length ? 'all' : f.statusGroup;
  return {
    statusGroup,
    status: f.statuses.length ? f.statuses : undefined,
    caseTypeId: f.caseTypeId,
    subTypeId: f.subTypeId,
    priority: f.priority,
    orderRelated: f.orderRelated || undefined,
    needsAction: f.needsAction,
    orderUpdated: f.orderUpdated || undefined,
    pendingOrder: f.pendingOrder || undefined,
    updatedFrom: f.updatedToday ? isoDate(now) : undefined,
    maxRating: f.maxRating,
    assignment: f.assignment,
    createdFrom: days ? isoDate(new Date(now.getTime() - days * 86_400_000)) : undefined,
    // The server needs at least 3 characters (spec §8.2); shorter input doesn't filter yet.
    q: term.length >= 3 ? term : undefined,
    sort: '-updatedAt',
    pageSize: 20,
  };
}
