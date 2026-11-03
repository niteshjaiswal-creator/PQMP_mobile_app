// Timeline wording (DETAIL-03, DETAIL-07, SRS 13.8). Dealers see one support identity (4.2) and no
// internal entries; internal users also see who did what.
import type { TimelineEvent } from '../../api/types';
import type { TimelineItem } from '../../components/Timeline';
import { customerFacingOwner, portalStatusLabel } from '../../domain/case-status';
import { displayDateTime, displayText } from '../../domain/display';

const TITLE: Record<TimelineEvent['type'], string> = {
  created: 'Case registered',
  status_change: '',
  comment: 'New message',
  clarification_requested: 'Clarification requested',
  clarification_response: 'Response received',
  attachment: 'File added',
  order_update: 'Order update',
  closure: 'Case closed',
  reopen: 'Case reopened',
  feedback: 'Feedback submitted',
  assignment: 'Assignment',
  internal_remark: 'Internal remark',
};

export function toTimelineItems(events: TimelineEvent[], internalView: boolean): TimelineItem[] {
  return events
    .filter(e => internalView || !e.internal)
    .map(e => {
      const who =
        e.actor.type === 'system' ? null
        : e.actor.type === 'dealer' ? (internalView ? displayText(e.actor.name, 'Dealer') : 'You')
        : internalView ? displayText(e.actor.name, 'Support')
        : customerFacingOwner(e.actor.name);
      return {
        id: e.id,
        title: e.type === 'status_change' ? portalStatusLabel(e.status, internalView) : TITLE[e.type],
        body: e.text && e.text !== TITLE[e.type] ? e.text : null,
        meta: who ? `${displayDateTime(e.at)} · ${who}` : displayDateTime(e.at),
        internal: e.internal,
      };
    });
}
