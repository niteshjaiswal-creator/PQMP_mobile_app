// LIST-03, LIST-04, DASH-04, SRS 14.1/14.4/14.7: dashboard and report tiles open the matching filtered list.
import { activeFilterCount, DEFAULT_FILTERS, filtersForPreset, toQuery } from './filters';

const NOW = new Date(2026, 10, 3);

it('maps every dashboard preset to a list query', () => {
  expect(toQuery(filtersForPreset('open'), '', NOW)).toMatchObject({ statusGroup: 'open' });
  expect(toQuery(filtersForPreset('closed'), '', NOW)).toMatchObject({ statusGroup: 'closed' });
  expect(toQuery(filtersForPreset('all'), '', NOW)).toMatchObject({ statusGroup: 'all' });
  expect(toQuery(filtersForPreset('inProgress'), '', NOW)).toMatchObject({ status: ['In Progress', 'Resume'] });
  expect(toQuery(filtersForPreset('reply'), '', NOW)).toMatchObject({ needsAction: 'reply' });
  expect(toQuery(filtersForPreset('feedback'), '', NOW)).toMatchObject({ statusGroup: 'closed', needsAction: 'feedback' });
  expect(toQuery(filtersForPreset('orderRelated'), '', NOW)).toMatchObject({ orderRelated: true });
  expect(toQuery(filtersForPreset('orderUpdates'), '', NOW)).toMatchObject({ statusGroup: 'open', orderUpdated: true });
});

it('maps every management report preset to a list query', () => {
  expect(toQuery(filtersForPreset('pendingOrder'), '', NOW)).toMatchObject({ statusGroup: 'open', pendingOrder: true });
  expect(toQuery(filtersForPreset('updatedToday'), '', NOW)).toMatchObject({ statusGroup: 'all', updatedFrom: '2026-11-03' });
  expect(toQuery(filtersForPreset('highPriority'), '', NOW)).toMatchObject({ statusGroup: 'open', priority: 'P1' });
  expect(toQuery(filtersForPreset('lowRating'), '', NOW)).toMatchObject({ statusGroup: 'closed', maxRating: 2 });
  // Report-only filters stay off the dealer presets.
  const plain = toQuery(filtersForPreset('open'), '', NOW);
  expect(plain.pendingOrder).toBeUndefined();
  expect(plain.updatedFrom).toBeUndefined();
  expect(plain.maxRating).toBeUndefined();
});

it('maps the internal old/pending home item to the old_pending list filter (SRS 13.2)', () => {
  const f = filtersForPreset('oldPending');
  expect(toQuery(f, '', NOW)).toMatchObject({ statusGroup: 'open', assignment: 'old_pending' });
  expect(activeFilterCount(f)).toBe(1);
  expect(toQuery(DEFAULT_FILTERS, '', NOW).assignment).toBeUndefined();
});

it('searches only from 3 characters', () => {
  expect(toQuery(DEFAULT_FILTERS, 'EU', NOW).q).toBeUndefined();
  expect(toQuery(DEFAULT_FILTERS, ' 4100231876 ', NOW).q).toBe('4100231876');
});

it('turns a date range into a created-from date', () => {
  expect(toQuery({ ...DEFAULT_FILTERS, dateRange: '7d' }, '', NOW).createdFrom).toBe('2026-10-27');
  expect(toQuery(DEFAULT_FILTERS, '', NOW).createdFrom).toBeUndefined();
});

it('counts applied filters for the badge', () => {
  expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
  expect(activeFilterCount({ ...DEFAULT_FILTERS, caseTypeId: '3', priority: 'P1', orderRelated: true })).toBe(3);
  expect(activeFilterCount(filtersForPreset('pendingOrder'))).toBe(1);
  expect(activeFilterCount(filtersForPreset('lowRating'))).toBe(1);
});
