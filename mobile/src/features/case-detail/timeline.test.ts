// DETAIL-03, DETAIL-04, DETAIL-07: chronological events, one support identity for dealers.
import type { TimelineEvent } from '../../api/types';
import { toTimelineItems } from './timeline';

const ev = (p: Partial<TimelineEvent>): TimelineEvent => ({
  id: 'e', type: 'status_change', at: '2026-10-25T14:10:00+05:30', actor: { type: 'support', name: 'Support Desk 1' }, status: 'In Progress', text: null, internal: false, ...p,
});

it('hides desk names and internal events from dealers', () => {
  const items = toTimelineItems(
    [ev({ id: '1' }), ev({ id: '2', type: 'internal_remark', text: 'secret', internal: true }), ev({ id: '3', type: 'created', actor: { type: 'dealer', name: 'Rohit' }, status: 'New', text: 'Case registered' })],
    false,
  );
  expect(items.map(i => i.id)).toEqual(['1', '3']);
  expect(items[0]).toMatchObject({ title: 'In Progress', meta: expect.stringContaining('PQMP Support') });
  expect(JSON.stringify(items)).not.toMatch(/Desk/);
  expect(items[1]).toMatchObject({ title: 'Case registered', body: null, meta: expect.stringContaining('You') });
});

it('shows internal entries and names to internal users', () => {
  const items = toTimelineItems([ev({ type: 'internal_remark', text: 'Plant confirmed', internal: true })], true);
  expect(items[0]).toMatchObject({ title: 'Internal remark', body: 'Plant confirmed', internal: true, meta: expect.stringContaining('Support Desk 1') });
});

it('labels clarification events and never shows raw statuses', () => {
  expect(toTimelineItems([ev({ type: 'clarification_requested', text: 'Confirm address' })], false)[0].title).toBe('Clarification requested');
  expect(toTimelineItems([ev({ status: 'XX' as never })], false)[0].title).toBe('Under Review');
});

it('shows Resume and Reassigned to internal users only (FLOW-01, 4.2.5)', () => {
  const events = [ev({ id: '1', status: 'Resume' }), ev({ id: '2', status: 'Re-Assigned' })];
  expect(toTimelineItems(events, true).map(i => i.title)).toEqual(['Resume', 'Reassigned']);
  expect(toTimelineItems(events, false).map(i => i.title)).toEqual(['In Progress', 'Assigned']);
});
