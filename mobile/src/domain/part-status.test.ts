// PART-02, PART-06, ORDER-02 — SRS 9.2 Order and Part Rules
import { derivePartStatus, isOrderFullyDelivered, pendingQuantity } from './part-status';

describe('pendingQuantity (9.2.3)', () => {
  it('is ordered minus delivered', () => expect(pendingQuantity(10, 4)).toBe(6));
  it('is unknown when data is missing or inconsistent', () => {
    expect(pendingQuantity(null, 4)).toBeNull();
    expect(pendingQuantity(10, 12)).toBeNull();
  });
});

describe('derivePartStatus', () => {
  it.each([
    [10, 10, 'fully-delivered'], // 9.2.4
    [10, 3, 'partially-delivered'], // 9.2.5
    [10, 0, 'not-delivered'], // 9.2.6
    [10, 12, 'under-review'], // 9.2.7 mismatch
    [0, 0, 'under-review'],
    [10, -1, 'under-review'],
    [null, 3, 'not-available'],
    [10, undefined, 'not-available'],
  ] as const)('ordered=%p delivered=%p -> %s', (ordered, delivered, expected) => {
    expect(derivePartStatus(ordered, delivered)).toBe(expected);
  });
});

describe('isOrderFullyDelivered (9.2.9)', () => {
  it('requires every part delivered', () => {
    expect(isOrderFullyDelivered([{ ordered: 2, delivered: 2 }, { ordered: 5, delivered: 5 }])).toBe(true);
    expect(isOrderFullyDelivered([{ ordered: 2, delivered: 2 }, { ordered: 5, delivered: 4 }])).toBe(false);
    expect(isOrderFullyDelivered([])).toBe(false);
  });
});
