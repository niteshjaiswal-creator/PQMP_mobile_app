// My Cases filters (LIST-03, LIST-04, DASH-04): state, dashboard presets and the API query.
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
};

export const DEFAULT_FILTERS: CaseFilters = { statusGroup: 'open', statuses: [], dateRange: 'any', orderRelated: false };

/** Status values a user can pick, in lifecycle order (portal statuses, SRS 10.1). */
export const FILTER_STATUSES: PortalStatus[] = ['New', 'Assigned', 'In Progress', 'Hold', 'Escalated', 'Re-Open', 'Close'];

export function filtersForPreset(preset: CasePreset | undefined): CaseFilters {
  switch (preset) {
    case 'closed': return { ...DEFAULT_FILTERS, statusGroup: 'closed' };
    case 'all': return { ...DEFAULT_FILTERS, statusGroup: 'all' };
    case 'inProgress': return { ...DEFAULT_FILTERS, statuses: ['In Progress', 'Resume'] };
    case 'reply': return { ...DEFAULT_FILTERS, needsAction: 'reply' };
    case 'feedback': return { ...DEFAULT_FILTERS, statusGroup: 'closed', needsAction: 'feedback' };
    case 'orderRelated': return { ...DEFAULT_FILTERS, orderRelated: true };
    default: return DEFAULT_FILTERS;
  }
}

/** Number of filters beyond the status group, for the filter button badge. */
export function activeFilterCount(f: CaseFilters): number {
  return [f.statuses.length > 0, !!f.caseTypeId, !!f.subTypeId, !!f.priority, f.dateRange !== 'any', f.orderRelated, !!f.needsAction].filter(Boolean).length;
}

const DAYS: Record<DateRange, number | null> = { any: null, '7d': 7, '30d': 30, '90d': 90 };

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
    createdFrom: days ? isoDate(new Date(now.getTime() - days * 86_400_000)) : undefined,
    // The server needs at least 3 characters (spec §8.2); shorter input doesn't filter yet.
    q: term.length >= 3 ? term : undefined,
    sort: '-updatedAt',
    pageSize: 20,
  };
}
