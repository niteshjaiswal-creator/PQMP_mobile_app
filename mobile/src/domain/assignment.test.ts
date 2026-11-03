// Admin assignment rules: SRS 6.3.4, 7.15, 13.12; spec §16.2.
import { assignMode, canPickDesk, lowestWorkloadDesk, validateAssignment } from './assignment';

const desks = [
  { id: 'd1', name: 'Support Desk 1', open: 42 },
  { id: 'd2', name: 'Support Desk 2', open: 18 },
  { id: 'd3', name: 'Support Desk 3', open: 27 },
];

describe('lowestWorkloadDesk', () => {
  it('picks the desk with the fewest open cases', () => {
    expect(lowestWorkloadDesk(desks)?.id).toBe('d2');
  });
  it('ignores the current desk on transfer', () => {
    expect(lowestWorkloadDesk(desks, 'd2')?.id).toBe('d3');
  });
  it('breaks ties by list order', () => {
    expect(lowestWorkloadDesk([{ id: 'a', name: 'A', open: 1 }, { id: 'b', name: 'B', open: 1 }])?.id).toBe('a');
  });
  it('returns null when no other desk exists', () => {
    expect(lowestWorkloadDesk([])).toBeNull();
    expect(lowestWorkloadDesk([desks[0]], 'd1')).toBeNull();
  });
});

describe('assignMode / canPickDesk', () => {
  it('assigns unassigned cases and transfers assigned ones', () => {
    expect(assignMode(null)).toBe('assign');
    expect(assignMode('d1')).toBe('transfer');
  });
  it('blocks the current desk', () => {
    expect(canPickDesk('d1', 'd1')).toBe(false);
    expect(canPickDesk('d2', 'd1')).toBe(true);
    expect(canPickDesk('d2', null)).toBe(true);
  });
});

describe('validateAssignment', () => {
  it('needs a desk', () => {
    expect(validateAssignment({ deskId: null, note: '' }, null)).toEqual({ deskId: 'Choose a desk.' });
  });
  it('makes the note optional for a new assignment', () => {
    expect(validateAssignment({ deskId: 'd2', note: '' }, null)).toBeNull();
  });
  it('requires a note on transfer', () => {
    expect(validateAssignment({ deskId: 'd2', note: '  ' }, 'd1')).toEqual({ note: 'Add a note explaining the transfer.' });
    expect(validateAssignment({ deskId: 'd2', note: 'Rebalancing workload' }, 'd1')).toBeNull();
  });
  it('rejects the current desk', () => {
    expect(validateAssignment({ deskId: 'd1', note: 'x' }, 'd1')?.deskId).toMatch(/already with that desk/);
  });
  it('limits note length', () => {
    expect(validateAssignment({ deskId: 'd2', note: 'a'.repeat(301) }, null)?.note).toMatch(/300/);
  });
});
