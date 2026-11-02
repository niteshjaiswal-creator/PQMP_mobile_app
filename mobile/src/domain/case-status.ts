// Case lifecycle (SRS 10.1, 10.2, task list FLOW-01/02) and customer-facing presentation rules (4.2, 10.3).
// Backend status codes are mapped onto these via the portal's Status Mapping Master; see analysis/portal.

export const CASE_STATUSES = [
  'draft',
  'submitted',
  'new',
  'awaiting-assignment',
  'assigned',
  'reassigned',
  'under-review',
  'in-progress',
  'hold',
  'resume',
  'escalated',
  'clarification-required',
  'awaiting-user-response',
  'awaiting-backend-update',
  'resolved',
  'closure-pending',
  'closed',
  'reopened',
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  new: 'New',
  'awaiting-assignment': 'Awaiting Assignment',
  assigned: 'Assigned',
  reassigned: 'Assigned', // internal re-routing is not surfaced to customers (4.2.5)
  'under-review': 'Under Review',
  'in-progress': 'In Progress',
  hold: 'On Hold',
  resume: 'In Progress',
  escalated: 'Escalated',
  'clarification-required': 'Clarification Required',
  'awaiting-user-response': 'Awaiting Your Response',
  'awaiting-backend-update': 'Awaiting Update',
  resolved: 'Resolved',
  'closure-pending': 'Closure Pending',
  closed: 'Closed',
  reopened: 'Reopened',
};

// The portal stores the label itself as the status value (analysis/portal/masters.md).
const FROM_PORTAL: Record<string, CaseStatus> = {
  New: 'new',
  Assigned: 'assigned',
  'Re-Assigned': 'reassigned',
  'In Progress': 'in-progress',
  Hold: 'hold',
  Resume: 'resume',
  Escalated: 'escalated',
  'Re-Open': 'reopened',
  Close: 'closed',
};

/** Maps an API/portal status value to the app status; unknown values return null (show via display.ts). */
export function fromPortalStatus(value: string | null | undefined): CaseStatus | null {
  return (value && FROM_PORTAL[value.trim()]) || null;
}

/** Dashboard KPI buckets (DASH-01). */
export type StatusBucket = 'open' | 'in-progress' | 'closed';

export function statusBucket(status: CaseStatus): StatusBucket {
  if (status === 'closed' || status === 'resolved') return 'closed';
  if (['draft', 'submitted', 'new', 'awaiting-assignment', 'reopened'].includes(status)) return 'open';
  return 'in-progress';
}

// SRS 10.2. Hold/Resume/Escalated/Reassigned come from the task list (FLOW-01) and are allowed from any active state.
const TRANSITIONS: Partial<Record<CaseStatus, CaseStatus[]>> = {
  draft: ['submitted'],
  submitted: ['awaiting-assignment', 'assigned', 'under-review', 'in-progress'],
  'awaiting-assignment': ['assigned'],
  assigned: ['in-progress', 'clarification-required', 'awaiting-backend-update', 'resolved', 'closure-pending', 'closed'],
  'under-review': ['in-progress', 'clarification-required', 'awaiting-backend-update', 'resolved', 'closure-pending', 'closed'],
  'clarification-required': ['awaiting-user-response'],
  'awaiting-user-response': ['in-progress'],
  'awaiting-backend-update': ['in-progress', 'resolved', 'closure-pending'],
  'closure-pending': ['closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['under-review', 'in-progress'],
};
const ANY_ACTIVE: CaseStatus[] = ['hold', 'resume', 'escalated', 'reassigned', 'in-progress'];

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  if (TRANSITIONS[from]?.includes(to)) return true;
  return statusBucket(from) !== 'closed' && from !== 'draft' && ANY_ACTIVE.includes(to);
}

/** Closed cases are read-only except for reopen (10.2.10); comments allowed while active (ATTACH-03). */
export const canComment = (status: CaseStatus) => statusBucket(status) !== 'closed';
export const canRespondToClarification = (status: CaseStatus) =>
  status === 'clarification-required' || status === 'awaiting-user-response';
export const isFeedbackEligible = (status: CaseStatus) => status === 'closed' || status === 'resolved';

// Customers see one generic support identity, never internal desk names (4.2, 10.3.4, LIST-09).
// TODO(VECV): confirm the approved customer-facing support name.
export const SUPPORT_IDENTITY = 'PQMP Support';

export function customerFacingOwner(owner: string | null | undefined, ownerVisible = false): string {
  if (!ownerVisible || !owner?.trim() || /\b(egp|desk)\b/i.test(owner)) return SUPPORT_IDENTITY;
  return owner.trim();
}

/** Colour family for status pills. */
export type StatusTone = 'new' | 'assigned' | 'progress' | 'hold' | 'escalated' | 'closed' | 'reopened';

const TONE: Record<CaseStatus, StatusTone> = {
  draft: 'new',
  submitted: 'new',
  new: 'new',
  'awaiting-assignment': 'new',
  assigned: 'assigned',
  reassigned: 'assigned',
  'under-review': 'assigned',
  'in-progress': 'progress',
  resume: 'progress',
  'clarification-required': 'progress',
  'awaiting-user-response': 'progress',
  'awaiting-backend-update': 'progress',
  hold: 'hold',
  escalated: 'escalated',
  resolved: 'closed',
  'closure-pending': 'closed',
  closed: 'closed',
  reopened: 'reopened',
};

export const statusTone = (status: CaseStatus | null): StatusTone => (status ? TONE[status] : 'hold');

/** Business label for an API/portal status value; unknown values never show raw (SRS 9.3). */
export function portalStatusLabel(value: string | null | undefined): string {
  const s = fromPortalStatus(value);
  return s ? CASE_STATUS_LABEL[s] : 'Under Review';
}
