// SRS 14.1–14.3, 14.7: management report shaping (period, category, status and rating rows).
import { categoryRows, displayAverage, displayCount, openStatusRows, periodFrom, ratingRows } from './report-view';

const NOW = new Date(2026, 10, 3);

it('turns the report period into a from date', () => {
  expect(periodFrom('30d', NOW)).toBe('2026-10-04');
  expect(periodFrom('90d', NOW)).toBe('2026-08-05');
  expect(periodFrom('all', NOW)).toBeUndefined();
});

it('lists the biggest categories and folds the rest into Other categories', () => {
  const rows = [
    { caseTypeId: '1', label: 'Invoice Query', count: 5 },
    { caseTypeId: '3', label: 'Order Status', count: 198 },
    { caseTypeId: '2', label: 'Logistics Support', count: 74 },
    { caseTypeId: '4', label: 'Project Poorti', count: 52 },
    { caseTypeId: '5', label: 'Order Cancellation', count: 41 },
    { caseTypeId: '6', label: 'Norms Modification', count: 42 },
    { caseTypeId: '7', label: '', count: 0 },
  ];
  expect(categoryRows(rows)).toEqual([
    { key: '3', label: 'Order Status', value: 198 },
    { key: '2', label: 'Logistics Support', value: 74 },
    { key: '4', label: 'Project Poorti', value: 52 },
    { key: '6', label: 'Norms Modification', value: 42 },
    { key: 'other', label: 'Other categories', value: 46 },
  ]);
  expect(categoryRows(rows.slice(0, 2)).map(r => r.label)).toEqual(['Order Status', 'Invoice Query']);
});

it('shows open statuses with business labels and never a raw value', () => {
  const rows = openStatusRows([
    { status: 'New', count: 14 },
    { status: 'In Progress', count: 64 },
    { status: 'Close', count: 300 },
    { status: 'Re-Open', count: 1 },
    { status: 'SOMETHING_ODD' as never, count: 2 },
    { status: 'Hold', count: 0 },
  ]);
  expect(rows.map(r => [r.label, r.value])).toEqual([['New', 14], ['In Progress', 64], ['Reopened', 1], ['Under Review', 2]]);
  expect(rows.find(r => r.label === 'Reopened')?.tone).toBe('reopened');
});

it('orders ratings 5 to 1 and fills missing ones with zero', () => {
  expect(ratingRows([{ rating: 1, count: 2 }, { rating: 5, count: 150 }])).toEqual([
    { rating: 5, count: 150 },
    { rating: 4, count: 0 },
    { rating: 3, count: 0 },
    { rating: 2, count: 0 },
    { rating: 1, count: 2 },
  ]);
});

it('formats counts and averages without null or NaN', () => {
  expect(displayAverage(4.26)).toBe('4.3');
  expect(displayAverage(4)).toBe('4.0');
  expect(displayAverage(null)).toBe('–');
  expect(displayCount(12)).toBe('12');
  expect(displayCount(null)).toBe('–');
  expect(displayCount(NaN)).toBe('–');
});
