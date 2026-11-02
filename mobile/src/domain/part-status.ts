// Part-wise delivery status derived from quantities (SRS 9.2 Order and Part Rules).

export type PartDeliveryStatus = 'fully-delivered' | 'partially-delivered' | 'not-delivered' | 'under-review' | 'not-available';

export const PART_STATUS_LABEL: Record<PartDeliveryStatus, string> = {
  'fully-delivered': 'Fully Delivered',
  'partially-delivered': 'Partially Delivered',
  'not-delivered': 'Not Delivered',
  'under-review': 'Under Review',
  'not-available': 'Not Available',
};

type Qty = number | null | undefined;
const known = (q: Qty): q is number => typeof q === 'number' && Number.isFinite(q);

/** Pending = ordered - delivered (9.2.3); null when either side is unknown or the data is inconsistent. */
export function pendingQuantity(ordered: Qty, delivered: Qty): number | null {
  if (!known(ordered) || !known(delivered) || delivered > ordered || delivered < 0) return null;
  return ordered - delivered;
}

export function derivePartStatus(ordered: Qty, delivered: Qty): PartDeliveryStatus {
  if (!known(ordered) || !known(delivered)) return 'not-available';
  // Quantities that cannot be true together are a SAP/API mismatch (9.2.7, 18.6).
  if (ordered <= 0 || delivered < 0 || delivered > ordered) return 'under-review';
  if (delivered === ordered) return 'fully-delivered';
  return delivered === 0 ? 'not-delivered' : 'partially-delivered';
}

/** An order is fully delivered only when every part is (feeds closure review eligibility, 9.2.9). */
export function isOrderFullyDelivered(parts: { ordered: Qty; delivered: Qty }[]): boolean {
  return parts.length > 0 && parts.every((p) => derivePartStatus(p.ordered, p.delivered) === 'fully-delivered');
}
