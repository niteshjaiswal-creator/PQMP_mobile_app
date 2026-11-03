// Admin assignment rules (SRS 6.3.4, 7.15, 8.10.2, 13.12; spec §16). Pure functions, no React.
// The backend enforces these too; the app checks them first so the admin gets an inline message.

export type DeskLoad = { id: string; name: string; open: number };

export type AssignMode = 'assign' | 'transfer';

/** An assigned case is transferred; an unassigned one is assigned. */
export const assignMode = (currentDeskId: string | null | undefined): AssignMode => (currentDeskId ? 'transfer' : 'assign');

/**
 * Desk with the fewest open cases, ignoring the case's current desk. Ties go to the first desk in
 * list order so the suggestion is stable. Null when no other desk is available.
 */
export function lowestWorkloadDesk(desks: DeskLoad[], currentDeskId?: string | null): DeskLoad | null {
  let best: DeskLoad | null = null;
  for (const d of desks) {
    if (d.id === currentDeskId) continue;
    if (!best || d.open < best.open) best = d;
  }
  return best;
}

/** The case's current desk can't be picked again (ALREADY_ASSIGNED). */
export const canPickDesk = (deskId: string, currentDeskId?: string | null) => deskId !== currentDeskId;

export const NOTE_MAX = 300;

export type AssignErrors = { deskId?: string; note?: string };

/** Field errors for the assign sheet, or null when the input can be sent. */
export function validateAssignment(input: { deskId: string | null; note: string }, currentDeskId?: string | null): AssignErrors | null {
  const errors: AssignErrors = {};
  if (!input.deskId) errors.deskId = 'Choose a desk.';
  else if (!canPickDesk(input.deskId, currentDeskId)) errors.deskId = 'This case is already with that desk. Choose another desk.';
  if (assignMode(currentDeskId) === 'transfer' && !input.note.trim()) errors.note = 'Add a note explaining the transfer.';
  else if (input.note.trim().length > NOTE_MAX) errors.note = `Keep the note within ${NOTE_MAX} characters.`;
  return errors.deskId || errors.note ? errors : null;
}
