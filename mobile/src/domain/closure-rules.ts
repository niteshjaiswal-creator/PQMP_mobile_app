// Feedback and reopen input rules (FEEDBACK-01/02, DETAIL-13/14, ATTACH-05, FLOW-04; SRS 9.4, 9.5, 13.11).
// Whether feedback or reopen is allowed at all comes from the server (case.actions).

export const REOPEN_MIN = 10;
export const REOPEN_MAX = 300;
export const FEEDBACK_REMARKS_MAX = 500;

export function validateReopen(remarks: string): string | null {
  const t = remarks.trim();
  if (!t) return 'Please add a reason to reopen the case.';
  if (t.length < REOPEN_MIN) return `Please give a little more detail (at least ${REOPEN_MIN} characters).`;
  if (t.length > REOPEN_MAX) return `Keep the reason within ${REOPEN_MAX} characters.`;
  return null;
}

export function validateFeedback(rating: number | null, remarks: string): string | null {
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) return 'Choose a rating from 1 to 5.';
  if (remarks.trim().length > FEEDBACK_REMARKS_MAX) return `Keep remarks within ${FEEDBACK_REMARKS_MAX} characters.`;
  return null;
}

export const RATING_LABEL = ['', 'Poor', 'Below average', 'Average', 'Good', 'Excellent'];
