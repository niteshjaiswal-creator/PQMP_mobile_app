// Contract tests for every endpoint module, run against the mock backend (src/mock).
// They pin the role and scope rules the real backend must also follow (SRS 4, 5, 9, 11.9).
// When the real API is live, delete this file with src/mock or point configureApi at a test server.
import { api } from './index';
import { ApiError, configureApi } from './client';
import { installMockApi, resetMockDb } from '../mock';
import { derivePartStatus } from '../domain/part-status';
import { displayDate } from '../domain/display';

let token: string | null = null;

async function signIn(userId: string) {
  const s = await api.login({ userId, password: 'any' });
  token = s.accessToken;
  return s;
}

beforeAll(() => {
  installMockApi({ delayMs: 0 });
  configureApi({ baseUrl: 'https://mock.local/api/mobile/v1', getToken: () => token });
});
beforeEach(() => {
  resetMockDb();
  token = null;
});

const fails = (p: Promise<unknown>) => p.then(() => { throw new Error('expected failure'); }, (e: ApiError) => e);

describe('auth (AUTH-01…04)', () => {
  it('returns the user and role on sign-in', async () => {
    const s = await signIn('dealer');
    expect(s.user.role.code).toBe('dealer');
    expect(s.user.activeDealerCode).toBe('1S1148');
  });
  it('rejects wrong passwords and inactive users with friendly messages', async () => {
    await expect(api.login({ userId: 'dealer', password: 'wrong' })).rejects.toMatchObject({
      userMessage: 'The User ID or password is incorrect. Please try again.',
    });
    await expect(api.login({ userId: 'inactive', password: 'x' })).rejects.toMatchObject({
      userMessage: expect.stringContaining('inactive'),
    });
  });
  it('treats calls without a session as expired', async () => {
    const err = await fails(api.getMe());
    expect(err.kind).toBe('unauthorized');
  });
});

describe('dealer', () => {
  beforeEach(() => signIn('dealer'));

  it('sees only own dealer cases and one support identity (SRS 4.2, 5)', async () => {
    const page = await api.listCases({ statusGroup: 'all' });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every(c => c.dealer === null && c.assignedDesk === null)).toBe(true);
    expect(page.items.map(c => c.caseNumber)).not.toContain('ICR261102107012'); // another dealer's case
    const err = await fails(api.getCase('107012'));
    expect(err.kind).toBe('not-found');

    const detail = await api.getCase('106958');
    expect(detail.handledBy.name).toBe('PQMP Support');
    const timeline = await api.getTimeline('106958');
    expect(timeline.some(e => e.internal)).toBe(false);
    expect(JSON.stringify(timeline)).not.toMatch(/Desk/);
  });

  it('shows dashboard counts that match the case list (SRS 8.2.4)', async () => {
    const d = await api.getDashboard();
    const all = await api.listCases({ statusGroup: 'all' });
    const open = await api.listCases({ statusGroup: 'open' });
    expect(d.total).toBe(all.totalItems);
    expect(d.open).toBe(open.totalItems);
    expect(d.awaitingUserResponse).toBe(1);
    expect(d.feedbackPending).toBe(1);
    expect(d.internal).toBeNull();
  });

  it('searches by case number and order number (LIST-03)', async () => {
    expect((await api.listCases({ statusGroup: 'all', q: '4100231876' })).items[0].caseNumber).toBe('EUR261024106958');
    expect((await api.listCases({ statusGroup: 'all', q: 'PD2610' })).items[0].caseNumber).toBe('PD261015106702');
  });

  it('creates a case through masters, lookup and submit (CREATE-*)', async () => {
    const types = await api.getCaseTypes();
    const eur = types.flatMap(t => t.subTypes).find(s => s.prefix === 'EUR')!;
    const form = await api.getSubTypeForm(eur.id);
    expect(form.orderRelated).toBe(true);
    expect(form.referenceStep.kinds).toContain('sales_order');

    const so = await api.lookupSalesOrder('4100239001');
    expect(so.parts).toHaveLength(3);

    const created = await api.createCase({
      subTypeId: eur.id,
      dealerCode: '1S1148',
      issueTitle: 'EDA needed',
      problemStatement: 'Please share EDA.',
      references: [{ type: 'sales_order', value: '4100239001', captureMethod: 'scan' }],
      contact: { person: 'Rohit', phone: '9876543210' },
      modeOfQuery: 'Call',
      parts: [so.parts[0]],
      attachmentIds: [],
    });
    expect(created.caseNumber).toMatch(/^EUR\d{6}\d+$/);
    const list = await api.listCases();
    expect(list.items[0].caseNumber).toBe(created.caseNumber);
  });

  it('links files uploaded during creation to the new case (CREATE-07, ATTACH-01)', async () => {
    await signIn('dealer');
    const up = await api.uploadAttachment({ uri: 'file:///photo.png', name: 'damaged_carton.png', type: 'image/png' }, 'case_create', 'gallery');
    const created = await api.createCase({
      subTypeId: '6',
      dealerCode: '1S1148',
      issueTitle: 'EDA needed',
      problemStatement: 'Please share EDA.',
      references: [{ type: 'sales_order', value: '4100239001', captureMethod: 'manual' }],
      contact: { person: 'Rohit', phone: '9876543210' },
      modeOfQuery: 'Call',
      parts: [],
      attachmentIds: [up.id],
    });
    const files = await api.getAttachments(created.id);
    expect(files.map(f => f.id)).toEqual([up.id]);
  });

  it('returns field errors and keeps nothing half-created on invalid input (CREATE-13)', async () => {
    const err = await fails(
      api.createCase({ subTypeId: '6', dealerCode: '1S1148', issueTitle: '', problemStatement: '', references: [], contact: { person: 'R', phone: '123' }, parts: [], attachmentIds: [] }),
    );
    expect(err.kind).toBe('validation');
    expect(err.fieldErrors).toMatchObject({ 'contact.phone': expect.any(String), issueTitle: expect.any(String) });
  });

  it('reports SAP lookup outages as temporarily unavailable', async () => {
    const err = await fails(api.lookupInvoice('0000000000'));
    expect(err.userMessage).toMatch(/Temporarily Unavailable/);
  });

  it('loads order, parts and tracking independently with fallbacks (SRS 9, 11.9.1)', async () => {
    const parts = await api.getParts('106958');
    const f821 = parts.parts.find(p => p.partNumber === 'F8210300')!;
    expect(derivePartStatus(f821.orderedQty, f821.deliveredQty)).toBe('partially-delivered');
    expect(displayDate(f821.invoiceDate)).toBe('Awaiting Update');
    expect(parts.section.lastRefreshedAt).toBeTruthy();

    const tracking = await api.getConsignments('106958');
    expect(tracking.consignments.map(c => c.section.state)).toEqual(['available', 'unavailable']);

    const sapDown = await api.getOrder('106911');
    expect(sapDown.section.state).toBe('unavailable');
    expect(sapDown.section.message).toBe('The latest order information is being updated.');
    await expect(api.getCase('106911')).resolves.toBeTruthy(); // the rest still loads

    const notOrder = await api.getOrder('106702');
    expect(notOrder.section.state).toBe('not_applicable');
  });

  it('answers a clarification, which clears "needs your reply" (ATTACH-04)', async () => {
    const comments = await api.getComments('106958');
    const ask = comments.find(c => c.isClarificationRequest)!;
    expect(ask.author.name).toBe('PQMP Support');
    await api.postComment('106958', { text: 'Address is the Indore workshop.', inReplyTo: ask.id });
    expect((await api.getDashboard()).awaitingUserResponse).toBe(0);
  });

  it('gives feedback once and reopens with mandatory remarks (FEEDBACK-*, DETAIL-14)', async () => {
    const closed = await api.getCase('106702');
    expect(closed.actions).toMatchObject({ canGiveFeedback: true, canReopen: true, canComment: false });
    await api.submitFeedback('106702', { rating: 4 });
    expect((await fails(api.submitFeedback('106702', { rating: 5 }))).userMessage).toBe('You have already rated this case.');

    expect((await fails(api.reopenCase('106702', { remarks: 'no' }))).kind).toBe('validation');
    const r = await api.reopenCase('106702', { remarks: 'Cartons damaged again on the next order.' });
    expect(r.status).toBe('Re-Open');
  });

  it('cannot use internal endpoints', async () => {
    expect((await fails(api.updateCase('106958', { action: 'update', remark: 'x', visibleToDealer: true }))).kind).toBe('forbidden');
    expect((await fails(api.getReportSummary())).kind).toBe('forbidden');
  });

  it('lists and marks notifications read (NOTIF-01)', async () => {
    const n = await api.listNotifications();
    expect(n.unreadCount).toBe(2);
    expect((await api.markNotificationsRead({ all: true })).unreadCount).toBe(0);
  });
});

describe('support desk (SRS 4.3)', () => {
  beforeEach(() => signIn('desk'));

  it('sees only its desk cases, with dealer and internal detail', async () => {
    const page = await api.listCases({ statusGroup: 'all' });
    expect(page.items.every(c => c.assignedDesk?.id === 'd1')).toBe(true);
    const timeline = await api.getTimeline('106958');
    expect(timeline.some(e => e.internal)).toBe(true);
    const d = await api.getDashboard();
    expect(d.internal?.byDesk).toHaveLength(3);
  });

  it('asks the dealer, adds an internal remark and closes with final remarks', async () => {
    await api.updateCase('106930', { action: 'clarify', remark: 'Please share a photo of the part label.', visibleToDealer: true });
    await api.updateCase('106930', { action: 'update', status: 'In Progress', remark: 'Checked with plant.', visibleToDealer: false });
    const err = await fails(api.updateCase('106930', { action: 'update', status: 'Resume', remark: 'x', visibleToDealer: true }));
    expect(err.kind).toBe('conflict');
    const closed = await api.updateCase('106930', { action: 'close', remark: 'Correct part dispatched.', visibleToDealer: true });
    expect(closed.status).toBe('Close');

    token = (await api.login({ userId: 'admin', password: 'x' })).accessToken;
    const t = await api.getTimeline('106930');
    expect(t.find(e => e.text === 'Checked with plant.')?.internal).toBe(true);
  });
});

describe('admin (SRS 7.15, 13.12)', () => {
  beforeEach(() => signIn('admin'));

  it('lists unassigned cases and assigns, then transfers with a note', async () => {
    const unassigned = await api.listCases({ assignment: 'unassigned' });
    expect(unassigned.items.map(c => c.caseNumber)).toContain('ICR261102107012');

    const desks = await api.listDesks();
    const lowest = [...desks].sort((a, b) => a.open - b.open)[0];
    const a = await api.assignCase('107012', { deskId: lowest.id });
    expect(a.status).toBe('Assigned');

    const other = desks.find(d => d.id !== lowest.id)!;
    expect((await fails(api.assignCase('107012', { deskId: other.id }))).fieldErrors).toHaveProperty('note');
    const t = await api.assignCase('107012', { deskId: other.id, note: 'Rebalancing workload' });
    expect(t.status).toBe('Re-Assigned');
  });
});

describe('management (SRS 4.5, 14)', () => {
  beforeEach(() => signIn('mgmt'));

  it('reads the report summary but cannot change cases', async () => {
    const r = await api.getReportSummary();
    expect(r.summary.total).toBe(r.summary.open + r.summary.closed);
    expect(r.deskWorkload).toHaveLength(3);
    expect(r.feedback.count).toBeGreaterThan(0);
    expect((await fails(api.assignCase('107012', { deskId: 'd1' }))).kind).toBe('forbidden');
    expect((await api.getCase('106958')).actions.canComment).toBe(false);
  });
});

describe('dashboard tiles match their lists (DASH-04, SRS 8.2.4)', () => {
  it('order/delivery updates count equals the orderUpdated list', async () => {
    await signIn('dealer');
    const d = await api.getDashboard();
    const list = await api.listCases({ statusGroup: 'open', orderUpdated: true });
    expect(list.totalItems).toBe(d.orderUpdates);
    expect(d.orderUpdates).toBeGreaterThan(0);
  });
});
