// DATA-*, ORDER-03/04, CONSIGN-03 — SRS 9.3 Data Display Rules
import { displayDate, displayLastRefreshed, displayQuantity, displayText, FALLBACK, parseBackendDate } from './display';

describe('displayText', () => {
  it.each([null, undefined, '', '   ', 'null', 'undefined'])('hides blank value %p', (v) => {
    expect(displayText(v)).toBe(FALLBACK.notAvailable);
  });
  it('trims real values', () => expect(displayText('  Bent bracket ')).toBe('Bent bracket'));
});

describe('displayQuantity (9.3.4)', () => {
  it('shows confirmed zero as 0', () => {
    expect(displayQuantity(0)).toBe('0');
    expect(displayQuantity('0')).toBe('0');
  });
  it.each([null, undefined, '', 'abc'])('shows %p as Not Available', (v) => {
    expect(displayQuantity(v)).toBe(FALLBACK.notAvailable);
  });
});

describe('displayDate (9.3.3)', () => {
  it.each(['0000-00-00', '00000000', '00.00.0000', '', null, 'not a date', '2026-02-30'])(
    'shows %p as Awaiting Update',
    (v) => expect(displayDate(v)).toBe(FALLBACK.awaitingUpdate),
  );
  it.each([
    ['20260312', '12 Mar 2026'],
    ['12.03.2026', '12 Mar 2026'],
    ['2026-03-12T10:00:00', '12 Mar 2026'],
  ])('formats %p', (raw, expected) => expect(displayDate(raw)).toBe(expected));

  it('rejects impossible SAP dates', () => expect(parseBackendDate('20261340')).toBeNull());
});

describe('displayLastRefreshed (9.3.8)', () => {
  it('always renders a label, even without a timestamp', () => {
    expect(displayLastRefreshed(null)).toBe('Last refreshed: Not Available');
    expect(displayLastRefreshed('2026-03-12T09:05:00')).toBe('Last refreshed: 12 Mar 2026, 09:05');
  });
});
