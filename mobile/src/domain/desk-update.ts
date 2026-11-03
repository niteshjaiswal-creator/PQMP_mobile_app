// Support desk case update rules (FLOW-03; SRS 4.3, 5, 8.8, 9.4.1; API spec §15.1).
// Which statuses a case may move to comes from the server (actions.allowedStatuses); the app never
// computes transitions. Ask dealer and Close are always dealer-visible; only "Add update" can be internal.
import type { CaseUpdateInput, PortalStatus } from '../api/types';

export type DeskAction = CaseUpdateInput['action'];

export const DESK_REMARK_MAX = 1000;

export type DeskUpdateForm = {
  action: DeskAction;
  /** Add update only; null keeps the current status. */
  status: PortalStatus | null;
  remark: string;
  /** Add update only. Off keeps the remark internal (SRS 5). */
  showToDealer: boolean;
  attachmentIds: string[];
};

export const emptyDeskUpdate = (action: DeskAction = 'update'): DeskUpdateForm => ({
  action,
  status: null,
  remark: '',
  showToDealer: true,
  attachmentIds: [],
});

export type DeskUpdateErrors = { remark?: string; status?: string };

export function remarkLabel(action: DeskAction): string {
  if (action === 'close') return 'Final remarks for the dealer';
  if (action === 'clarify') return 'Question for the dealer';
  return 'Remark';
}

export function validateDeskUpdate(f: DeskUpdateForm, allowedStatuses: PortalStatus[]): DeskUpdateErrors {
  const errors: DeskUpdateErrors = {};
  const remark = f.remark.trim();
  if (!remark) {
    errors.remark =
      f.action === 'close' ? 'Enter the final remarks for the dealer.'
      : f.action === 'clarify' ? 'Enter the question for the dealer.'
      : 'Enter a remark.';
  } else if (remark.length > DESK_REMARK_MAX) {
    errors.remark = `Keep it within ${DESK_REMARK_MAX} characters.`;
  }
  if (f.action === 'update' && f.status && !allowedStatuses.includes(f.status)) {
    errors.status = 'This status is not available for the case right now.';
  }
  return errors;
}

export const hasErrors = (e: DeskUpdateErrors) => Object.keys(e).length > 0;

/** The request body for POST /cases/{id}/updates. */
export function toUpdateInput(f: DeskUpdateForm): CaseUpdateInput {
  const input: CaseUpdateInput = {
    action: f.action,
    remark: f.remark.trim(),
    visibleToDealer: f.action === 'update' ? f.showToDealer : true,
  };
  if (f.action === 'update' && f.status) input.status = f.status;
  if (f.attachmentIds.length) input.attachmentIds = f.attachmentIds;
  return input;
}
