// In-memory implementation of the mobile API contract (analysis/api/mobile-api-spec.md) for
// development and tests until the real backend exists. Data comes only from ./data.ts.
// It follows the same role and scope rules the backend must enforce (SRS 5).
import type { TransportRequest, TransportResponse } from '../api/client';
import type {
  Actor,
  Attachment,
  CaseDetail,
  CaseSummary,
  Comment,
  DashboardSummary,
  FormField,
  Me,
  PortalStatus,
  ReportSummary,
  SubTypeForm,
  TimelineEvent,
} from '../api/types';
import * as D from './data';
import type { MockCase, MockUser } from './data';

type Db = {
  cases: MockCase[];
  notifications: typeof D.NOTIFICATIONS;
  seq: number;
  /** Files uploaded with POST /attachments, waiting to be linked to a case. */
  uploads: Record<string, Attachment>;
};

let db: Db = createDb();

function createDb(): Db {
  return {
    cases: JSON.parse(JSON.stringify(D.CASES)),
    notifications: JSON.parse(JSON.stringify(D.NOTIFICATIONS)),
    seq: 107100,
    uploads: {},
  };
}

/** Restores the original data (tests call this in beforeEach). */
export function resetMockDb() {
  db = createDb();
}

// ---------- helpers ----------

const ok = (data: unknown, meta?: unknown, status = 200): TransportResponse => ({
  status,
  body: meta === undefined ? { data, meta: { serverTime: D.NOW } } : { data, meta },
});
const fail = (status: number, code: string, message?: string, fieldErrors?: Record<string, string>): TransportResponse => ({
  status,
  body: { code, message, fieldErrors },
});

class HttpError extends Error {
  constructor(readonly res: TransportResponse) {
    super(String((res.body as { code?: string })?.code));
  }
}

const OPEN_STATUSES: PortalStatus[] = ['New', 'Assigned', 'Re-Assigned', 'In Progress', 'Hold', 'Resume', 'Escalated', 'Re-Open'];
const isOpen = (c: MockCase) => c.status !== 'Close';
const typeOf = (c: MockCase) => D.CASE_TYPES.find(t => t.id === c.caseTypeId)!;
const subTypeOf = (c: MockCase) => typeOf(c).subTypes.find(s => s.id === c.subTypeId)!;
const deskName = (id: string | null) => D.DESKS.find(d => d.id === id)?.name ?? null;
const isOrderRelated = (c: MockCase) => D.ORDER_RELATED_TYPES.includes(c.caseTypeId);
const isInternal = (u: MockUser) => u.role !== 'dealer';
const daysOpen = (c: MockCase) => (Date.parse(D.NOW) - Date.parse(c.createdAt)) / 86_400_000;
const OLD_PENDING_DAYS = 7; // TODO(VECV): confirm the "old/pending" threshold (SRS 10.4)

function userFrom(req: TransportRequest): MockUser {
  const token = req.headers.Authorization?.replace(/^Bearer mock\./, '');
  const user = D.USERS.find(u => u.userId === token);
  if (!user) throw new HttpError(fail(401, 'SESSION_EXPIRED', 'Your session has expired. Please log in again.'));
  return user;
}

function inScope(u: MockUser, c: MockCase): boolean {
  if (u.role === 'dealer') return u.dealerCodes.includes(c.dealerCode);
  if (u.role === 'support') return c.deskId === u.deskId;
  return true; // admin, management: all cases (region/hierarchy scope is applied by the real backend)
}

function findCase(u: MockUser, id: string): MockCase {
  const c = db.cases.find(x => x.id === id || x.caseNumber === id);
  // Out of scope looks the same as missing, so case numbers can't be probed (spec §2.4).
  if (!c || !inScope(u, c)) throw new HttpError(fail(404, 'CASE_NOT_FOUND'));
  return c;
}

const requireRole = (u: MockUser, ...roles: MockUser['role'][]) => {
  if (!roles.includes(u.role)) throw new HttpError(fail(403, 'FORBIDDEN'));
};

/** What a dealer sees of a support or admin actor: one identity, never desk names (SRS 4.2). */
const actorFor = (u: MockUser, a: Actor): Actor =>
  isInternal(u) || a.type === 'dealer' || a.type === 'system' ? a : { type: 'support', name: D.SUPPORT_NAME };

function visibleComments(u: MockUser, c: MockCase): Comment[] {
  return c.comments
    .filter(m => isInternal(u) || !m.internal)
    .map(m => ({ ...m, author: actorFor(u, m.author) }));
}

function needsAction(c: MockCase): CaseSummary['needsAction'] {
  if (c.status === 'Close') return c.feedback ? null : 'feedback';
  const last = [...c.comments].filter(m => !m.internal).pop();
  return last?.isClarificationRequest ? 'reply' : null;
}

function latestUpdate(u: MockUser, c: MockCase) {
  const e = c.timeline.find(t => isInternal(u) || !t.internal);
  return e ? { at: e.at, text: e.text ?? e.status ?? 'Updated' } : null;
}

function summaryOf(u: MockUser, c: MockCase): CaseSummary {
  const t = typeOf(c);
  const s = subTypeOf(c);
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    caseType: { id: t.id, code: t.code, label: t.label },
    subType: { id: s.id, code: s.code, label: s.label, prefix: s.prefix },
    status: c.status,
    statusGroup: isOpen(c) ? 'open' : 'closed',
    priority: c.priority,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    issueTitle: c.issueTitle,
    primaryReference: c.references[0] ?? null,
    summary: (c.problemStatement ?? s.label).slice(0, 120),
    latestUpdate: latestUpdate(u, c),
    unreadCount: u.role === 'dealer' ? c.comments.filter(m => !m.read && m.author.type !== 'dealer' && !m.internal).length : 0,
    needsAction: u.role === 'dealer' ? needsAction(c) : null,
    hasOrderData: isOrderRelated(c) && c.order !== null,
    hasConsignment: (c.consignments?.length ?? 0) > 0,
    dealer: isInternal(u) ? { dealerCode: c.dealerCode, name: D.DEALERS[c.dealerCode]?.name ?? c.dealerCode } : null,
    assignedDesk: isInternal(u) && c.deskId ? { id: c.deskId, name: deskName(c.deskId)! } : null,
  };
}

function allowedStatuses(c: MockCase): PortalStatus[] {
  switch (c.status) {
    case 'Hold': return ['Resume'];
    case 'In Progress': return ['Hold'];
    case 'Close': return [];
    default: return ['In Progress', 'Hold'];
  }
}

function detailOf(u: MockUser, c: MockCase): CaseDetail {
  const handler: Actor = isInternal(u) && c.deskId ? { type: 'support', name: deskName(c.deskId) } : { type: 'support', name: D.SUPPORT_NAME };
  const canUpdate = isOpen(c) && ((u.role === 'support' && c.deskId === u.deskId) || u.role === 'admin');
  const comments = visibleComments(u, c);
  return {
    ...summaryOf(u, c),
    createdBy: { type: 'dealer', name: c.contact.person },
    handledBy: handler,
    references: c.references,
    contact: c.contact,
    modeOfQuery: c.modeOfQuery,
    problemStatement: c.problemStatement,
    remarks: c.remarks,
    fields: c.fields,
    parts: c.parts,
    closure: c.closure ? { ...c.closure, closedBy: handler } : null,
    feedback: c.feedback,
    actions: {
      canComment: isOpen(c) && u.role !== 'management',
      canAddFiles: isOpen(c) && u.role !== 'management',
      canGiveFeedback: u.role === 'dealer' && c.status === 'Close' && !c.feedback,
      canReopen: u.role === 'dealer' && c.status === 'Close' && c.reopenAllowed,
      canUpdate,
      canAssign: u.role === 'admin' && isOpen(c),
      allowedStatuses: canUpdate ? allowedStatuses(c) : [],
    },
    sections: {
      order: isOrderRelated(c) && c.order !== null,
      parts: c.partLines !== null,
      consignment: (c.consignments?.length ?? 0) > 0,
    },
    counts: {
      comments: comments.length,
      unreadComments: summaryOf(u, c).unreadCount,
      attachments: c.attachments.length,
    },
  };
}

function addEvent(c: MockCase, e: Omit<TimelineEvent, 'id' | 'at'>) {
  const event = { ...e, id: `ev_${++db.seq}`, at: D.NOW };
  c.timeline.unshift(event);
  c.updatedAt = D.NOW;
  return event;
}

function meOf(u: MockUser): Me {
  return {
    id: `u_${u.userId}`,
    userId: u.userId,
    name: u.name,
    role: { code: u.role, label: { dealer: 'Dealer', support: 'EGP Support Desk', admin: 'Admin', management: 'Management' }[u.role] },
    dealers: u.dealerCodes.map((code, i) => ({ dealerCode: code, name: D.DEALERS[code].name, city: D.DEALERS[code].city, isDefault: i === 0 })),
    activeDealerCode: u.dealerCodes[0] ?? null,
    desk: u.deskId ? { id: u.deskId, name: deskName(u.deskId)! } : null,
    permissions: {
      dealer: ['case.create', 'case.view', 'case.comment', 'case.feedback', 'case.reopen'],
      support: ['case.view', 'case.comment', 'case.update', 'case.close'],
      admin: ['case.view', 'case.assign', 'case.update'],
      management: ['case.view', 'report.view'],
    }[u.role],
    location: u.location,
  };
}

function formFor(subTypeId: string): SubTypeForm {
  const kinds = D.REFERENCE_KINDS[subTypeId] ?? [];
  const fields: FormField[] = [
    { key: 'issueTitle', label: 'Issue title', type: 'text', required: true, maxLength: 100 },
    { key: 'problemStatement', label: 'Issue description', type: 'textarea', required: true, maxLength: 300 },
    { key: 'contact.person', label: 'Contact person', type: 'text', required: true, maxLength: 30, prefillFrom: 'user' },
    { key: 'contact.phone', label: 'Contact number', type: 'phone', required: true, maxLength: 15, prefillFrom: 'user' },
    { key: 'contact.email', label: 'Email', type: 'email', required: false },
    ...(subTypeId === '60' ? [] : [{ key: 'modeOfQuery', label: 'How should we reach you?', type: 'select' as const, required: true, optionsList: 'mode_of_query' }]),
    ...(D.EXTRA_FIELDS[subTypeId] ?? []),
    { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, maxLength: 300 },
  ];
  const caseTypeId = D.CASE_TYPES.find(t => t.subTypes.some(s => s.id === subTypeId))?.id ?? '';
  return {
    subTypeId,
    orderRelated: D.ORDER_RELATED_TYPES.includes(caseTypeId),
    referenceStep: { kinds, multiple: subTypeId === '51' || subTypeId === '50', required: kinds.length > 0, scanAllowed: kinds.includes('invoice') || kinds.includes('sap_document') || kinds.includes('sales_order') },
    fields,
    parts: { enabled: D.PART_ROW_SUBTYPES.includes(subTypeId), required: D.PART_ROW_SUBTYPES.includes(subTypeId) && subTypeId !== '6', min: 0, max: 20 },
    attachments: { required: subTypeId === '27' || subTypeId === '17', min: subTypeId === '17' ? 1 : 0, max: 5, maxSizeMb: 10, mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'] },
  };
}

function dashboardOf(u: MockUser): DashboardSummary {
  const mine = db.cases.filter(c => inScope(u, c));
  const open = mine.filter(isOpen);
  const byCat = new Map<string, { caseTypeId: string; label: string; count: number }>();
  for (const c of mine) {
    const t = typeOf(c);
    const row = byCat.get(t.id) ?? { caseTypeId: t.id, label: t.label, count: 0 };
    row.count++;
    byCat.set(t.id, row);
  }
  const internal = u.role === 'support' || u.role === 'admin';
  const all = db.cases;
  return {
    total: mine.length,
    open: open.length,
    inProgress: open.filter(c => c.status === 'In Progress' || c.status === 'Resume').length,
    closed: mine.length - open.length,
    recentlyUpdated: mine.filter(c => Date.parse(D.NOW) - Date.parse(c.updatedAt) < 7 * 86_400_000).length,
    awaitingUserResponse: open.filter(c => needsAction(c) === 'reply').length,
    feedbackPending: mine.filter(c => needsAction(c) === 'feedback').length,
    orderUpdates: open.filter(c => c.timeline.some(e => e.type === 'order_update')).length,
    byCategory: [...byCat.values()].sort((a, b) => b.count - a.count),
    unreadNotifications: (db.notifications[u.userId] ?? []).filter(n => !n.read).length,
    asOf: D.NOW,
    internal: internal
      ? {
          unassigned: all.filter(c => isOpen(c) && !c.deskId).length,
          byDesk: D.DESKS.map(d => ({ deskId: d.id, name: d.name, open: all.filter(c => isOpen(c) && c.deskId === d.id).length })),
          oldPending: (u.role === 'admin' ? all : mine).filter(c => isOpen(c) && daysOpen(c) > OLD_PENDING_DAYS).length,
          integrationFailures: D.INTEGRATION_FAILURES,
          dealerReplied: mine.filter(c => isOpen(c) && c.comments[c.comments.length - 1]?.author.type === 'dealer').length,
        }
      : null,
  };
}

const hasPendingParts = (c: MockCase) => !!c.partLines?.some(p => (p.orderedQty ?? 0) > (p.deliveredQty ?? 0));

function reportOf(q: Record<string, string>): ReportSummary {
  const cases = db.cases.filter(c => (!q.caseTypeId || c.caseTypeId === q.caseTypeId) && (!q.from || c.createdAt >= q.from) && (!q.to || c.createdAt <= `${q.to}T23:59:59`));
  const open = cases.filter(isOpen);
  const rated = cases.filter(c => c.feedback);
  const statusCounts = OPEN_STATUSES.concat('Close').map(status => ({ status, count: cases.filter(c => c.status === status).length })).filter(r => r.count > 0);
  const byCat = D.CASE_TYPES.map(t => ({ caseTypeId: t.id, label: t.label, count: cases.filter(c => c.caseTypeId === t.id).length })).filter(r => r.count > 0);
  return {
    period: { from: q.from ?? null, to: q.to ?? null },
    summary: {
      total: cases.length,
      open: open.length,
      closed: cases.length - open.length,
      pendingOrder: open.filter(hasPendingParts).length,
      updatedToday: cases.filter(c => c.updatedAt.slice(0, 10) === D.NOW.slice(0, 10)).length,
      highPriority: open.filter(c => c.priority?.code === 'P1').length,
      awaitingUserResponse: open.filter(c => needsAction(c) === 'reply').length,
      feedbackPending: cases.filter(c => needsAction(c) === 'feedback').length,
    },
    byCategory: byCat.sort((a, b) => b.count - a.count),
    byStatus: statusCounts,
    feedback: {
      average: rated.length ? Math.round((rated.reduce((s, c) => s + c.feedback!.rating, 0) / rated.length) * 10) / 10 : null,
      count: rated.length,
      distribution: [5, 4, 3, 2, 1].map(r => ({ rating: r, count: rated.filter(c => c.feedback!.rating === r).length })),
      lowRatingCount: rated.filter(c => c.feedback!.rating <= 2).length,
    },
    deskWorkload: D.DESKS.map(d => ({
      deskId: d.id,
      name: d.name,
      open: open.filter(c => c.deskId === d.id).length,
      closed: cases.filter(c => !isOpen(c) && c.deskId === d.id).length,
      transferred: cases.filter(c => c.deskId === d.id).reduce((s, c) => s + c.transferred, 0),
    })),
    unassigned: open.filter(c => !c.deskId).length,
    integrationExceptions: D.INTEGRATION_FAILURES,
    lastRefreshedAt: D.NOW,
  };
}

function listCasesFor(u: MockUser, q: Record<string, string>) {
  const group = q.statusGroup ?? 'open';
  const statuses = q.status?.split(',');
  const term = q.q?.trim().toLowerCase();
  let rows = db.cases.filter(c => inScope(u, c));
  if (group !== 'all') rows = rows.filter(c => (group === 'open') === isOpen(c));
  if (statuses) rows = rows.filter(c => statuses.includes(c.status));
  if (q.caseTypeId) rows = rows.filter(c => c.caseTypeId === q.caseTypeId);
  if (q.subTypeId) rows = rows.filter(c => c.subTypeId === q.subTypeId);
  if (q.priority) rows = rows.filter(c => c.priority?.code === q.priority);
  if (q.orderRelated === 'true') rows = rows.filter(isOrderRelated);
  if (q.needsAction) rows = rows.filter(c => needsAction(c) === q.needsAction);
  if (q.pendingOrder === 'true') rows = rows.filter(c => isOpen(c) && hasPendingParts(c));
  if (q.updatedFrom) rows = rows.filter(c => c.updatedAt >= q.updatedFrom);
  if (q.maxRating) rows = rows.filter(c => !!c.feedback && c.feedback.rating <= Number(q.maxRating));
  if (q.createdFrom) rows = rows.filter(c => c.createdAt >= q.createdFrom);
  if (q.createdTo) rows = rows.filter(c => c.createdAt <= `${q.createdTo}T23:59:59`);
  if (q.deskId) rows = rows.filter(c => c.deskId === q.deskId);
  if (q.assignment === 'unassigned') rows = rows.filter(c => !c.deskId);
  if (q.assignment === 'assigned') rows = rows.filter(c => !!c.deskId);
  if (q.assignment === 'old_pending') rows = rows.filter(c => isOpen(c) && daysOpen(c) > OLD_PENDING_DAYS);
  if (term && term.length >= 3) {
    rows = rows.filter(c =>
      // Internal users can also search by dealer code or name (workbench, SRS 13.12).
      [c.caseNumber, ...c.references.map(r => r.value), ...c.parts.map(p => p.partNumber), ...(isInternal(u) ? [c.dealerCode, D.DEALERS[c.dealerCode]?.name ?? ''] : [])].some(v => v.toLowerCase().includes(term)),
    );
  }
  const sort = q.sort ?? '-updatedAt';
  const key = sort.replace('-', '') as 'updatedAt' | 'createdAt';
  rows = [...rows].sort((a, b) => (sort.startsWith('-') ? -1 : 1) * a[key].localeCompare(b[key]));
  if (q.assignment === 'old_pending') rows.reverse(); // oldest first
  const page = Number(q.page ?? 1);
  const pageSize = Math.min(Number(q.pageSize ?? 20), 50);
  const items = rows.slice((page - 1) * pageSize, page * pageSize).map(c => summaryOf(u, c));
  return ok(items, { page, pageSize, totalItems: rows.length, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)) });
}

// ---------- routes ----------

type Handler = (req: TransportRequest, p: string[]) => TransportResponse;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, pattern: string, h: Handler) =>
  routes.push([method, new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`), h]);
/** Rejects calls without a valid session, then runs the handler. */
const signedIn = (h: Handler): Handler => (req, p) => {
  userFrom(req);
  return h(req, p);
};

on('POST', '/auth/login', req => {
  const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
  if (username === 'inactive') return fail(403, 'USER_INACTIVE');
  const user = D.USERS.find(u => u.userId === username?.toLowerCase());
  if (!user || !password || password === 'wrong') return fail(401, 'INVALID_CREDENTIALS');
  return ok({ accessToken: `mock.${user.userId}`, accessTokenExpiresIn: 900, refreshToken: `mockrt.${user.userId}`, refreshTokenExpiresIn: 2_592_000, user: meOf(user) });
});
on('POST', '/auth/refresh', req => {
  const id = String((req.body as { refreshToken?: string })?.refreshToken ?? '').replace('mockrt.', '');
  if (!D.USERS.some(u => u.userId === id)) return fail(401, 'SESSION_EXPIRED');
  return ok({ accessToken: `mock.${id}`, accessTokenExpiresIn: 900, refreshToken: `mockrt.${id}`, refreshTokenExpiresIn: 2_592_000 });
});
on('POST', '/auth/logout', () => ({ status: 204, body: undefined }));
on('GET', '/me', req => ok(meOf(userFrom(req))));

on('GET', '/masters/case-types', signedIn(() => ok(D.CASE_TYPES)));
on('GET', '/masters/sub-types/:id/form', (req, [id]) => {
  userFrom(req);
  return D.CASE_TYPES.some(t => t.subTypes.some(s => s.id === id)) ? ok(formFor(id)) : fail(404, 'NOT_FOUND');
});
on('GET', '/masters/options/:list', signedIn((_, [list]) => (D.OPTIONS[list] ? ok(D.OPTIONS[list]) : fail(404, 'NOT_FOUND'))));

const lookup = (kind: keyof typeof D.LOOKUPS): Handler => (req, [no]) => {
  userFrom(req);
  if (/^0+$/.test(no)) return fail(503, 'UPSTREAM_UNAVAILABLE');
  const hit = D.LOOKUPS[kind][no];
  return hit ? ok(hit, { lastRefreshedAt: D.NOW }) : fail(404, 'REFERENCE_NOT_FOUND', "We couldn't find this number. Check it and try again.");
};
on('GET', '/lookups/invoices/:no', lookup('invoice'));
on('GET', '/lookups/sales-orders/:no', lookup('sales_order'));
on('GET', '/lookups/sap-documents/:no', lookup('sap_document'));
on('GET', '/lookups/parts/:no', (req, [no]) => {
  userFrom(req);
  const d = D.PART_MASTER[no.toUpperCase()];
  return d ? ok({ partNumber: no.toUpperCase(), description: d }) : fail(404, 'PART_NOT_FOUND', "We couldn't find this part number.");
});

/** Name and type of the `file` part of a React Native FormData body, when there is one. */
function uploadedFile(body: unknown): { name?: string; type?: string } {
  const parts = (body as { _parts?: [string, unknown][] } | null)?._parts ?? [];
  const file = parts.find(([k]) => k === 'file')?.[1];
  return file && typeof file === 'object' ? (file as { name?: string; type?: string }) : {};
}

on('POST', '/attachments', req => {
  const u = userFrom(req);
  const id = `att_${++db.seq}`;
  const f = uploadedFile(req.body);
  const a: Attachment = { id, fileName: f.name || 'upload.jpg', mimeType: f.type || 'image/jpeg', sizeBytes: 100_000, uploadedAt: D.NOW, uploadedBy: { type: u.role === 'dealer' ? 'dealer' : 'support', name: u.name }, source: u.role === 'dealer' ? 'user' : 'support' };
  db.uploads[id] = a;
  return ok(a, undefined, 201);
});

/** Attachments for ids returned by POST /attachments (unknown ids get a placeholder record). */
function takeUploads(u: MockUser, ids: string[]): Attachment[] {
  return ids.map(aid => {
    const a = db.uploads[aid] ?? { id: aid, fileName: `${aid}.jpg`, mimeType: 'image/jpeg', sizeBytes: 100_000, uploadedAt: D.NOW, uploadedBy: { type: (u.role === 'dealer' ? 'dealer' : 'support') as Actor['type'], name: u.name }, source: (u.role === 'dealer' ? 'user' : 'support') as 'user' | 'support' };
    delete db.uploads[aid];
    return a;
  });
}
on('GET', '/attachments/:id/download', signedIn((_, [id]) => ok({ url: `https://files.example.invalid/${id}?sig=mock`, expiresAt: D.NOW, fileName: id, mimeType: 'application/octet-stream' })));

on('GET', '/dashboard/summary', req => ok(dashboardOf(userFrom(req))));
on('GET', '/cases', req => listCasesFor(userFrom(req), req.query));

on('POST', '/cases', req => {
  const u = userFrom(req);
  requireRole(u, 'dealer');
  const b = (req.body ?? {}) as Partial<import('../api/types').CreateCaseInput>;
  const errors: Record<string, string> = {};
  const st = D.CASE_TYPES.flatMap(t => t.subTypes.map(s => ({ t, s }))).find(x => x.s.id === b.subTypeId);
  if (!st) errors.subTypeId = 'Choose a sub-category.';
  if (!b.issueTitle?.trim()) errors.issueTitle = 'Enter an issue title.';
  if (!b.problemStatement?.trim()) errors.problemStatement = 'Describe the issue.';
  if (!b.contact?.person?.trim()) errors['contact.person'] = 'Enter a contact person.';
  if (!/^\d{10}$/.test(b.contact?.phone ?? '')) errors['contact.phone'] = 'Enter a valid 10-digit mobile number.';
  if (b.dealerCode && !u.dealerCodes.includes(b.dealerCode)) errors.dealerCode = 'You cannot raise a case for this dealer.';
  if (st && D.REFERENCE_KINDS[st.s.id]?.length && !b.references?.length) errors.references = 'Enter the order reference.';
  if (Object.keys(errors).length) return fail(422, 'VALIDATION_FAILED', 'Some details need attention before continuing.', errors);
  if (b.problemStatement === 'FAIL') return fail(503, 'CASE_CREATE_FAILED'); // lets testers check CREATE-13

  const id = String(++db.seq);
  const yymmdd = D.NOW.slice(2, 10).replace(/-/g, '');
  const c: MockCase = {
    id, caseNumber: `${st!.s.prefix}${yymmdd}${id}`, caseTypeId: st!.t.id, subTypeId: st!.s.id, status: 'New', priority: null,
    dealerCode: b.dealerCode ?? u.dealerCodes[0], deskId: null, createdAt: D.NOW, updatedAt: D.NOW,
    issueTitle: b.issueTitle!, problemStatement: b.problemStatement!, remarks: b.remarks ?? null, references: b.references ?? [],
    contact: { person: b.contact!.person, phone: b.contact!.phone, email: b.contact!.email ?? null }, modeOfQuery: b.modeOfQuery ?? null,
    fields: [], parts: (b.parts ?? []).map(p => ({ partNumber: p.partNumber, description: p.description ?? null, quantity: p.quantity ?? null, hsnCode: null })),
    closure: null, feedback: null, reopenAllowed: false, transferred: 0,
    order: D.ORDER_RELATED_TYPES.includes(st!.t.id) ? { section: { state: 'pending', message: 'Order details will appear once support starts on the case.', lastRefreshedAt: null }, order: null } : null,
    partLines: null, consignments: [], timeline: [], comments: [], attachments: takeUploads(u, b.attachmentIds ?? []),
  };
  addEvent(c, { type: 'created', actor: { type: 'dealer', name: c.contact.person }, status: 'New', text: 'Case registered', internal: false });
  db.cases.unshift(c);
  (db.notifications[u.userId] ??= []).unshift({ id: `n_${id}`, type: 'case_created', title: 'Case registered', body: 'We have received your case.', caseId: id, caseNumber: c.caseNumber, createdAt: D.NOW, read: false });
  return ok({ id, caseNumber: c.caseNumber, status: c.status, createdAt: c.createdAt, clientDraftId: b.clientDraftId }, undefined, 201);
});

on('GET', '/cases/:id', (req, [id]) => {
  const u = userFrom(req);
  return ok(detailOf(u, findCase(u, id)));
});
on('GET', '/cases/:id/timeline', (req, [id]) => {
  const u = userFrom(req);
  return ok(findCase(u, id).timeline.filter(e => isInternal(u) || !e.internal).map(e => ({ ...e, actor: actorFor(u, e.actor) })));
});

const notApplicable = { state: 'not_applicable', message: null, lastRefreshedAt: null } as const;
on('GET', '/cases/:id/order', (req, [id]) => {
  const c = findCase(userFrom(req), id);
  return ok(c.order ?? { section: notApplicable, order: null });
});
on('GET', '/cases/:id/parts', (req, [id]) => {
  const c = findCase(userFrom(req), id);
  if (!c.partLines) return ok({ section: c.order ? c.order.section : notApplicable, parts: [] });
  return ok({ section: c.order?.section ?? { state: 'available', message: null, lastRefreshedAt: D.NOW }, parts: c.partLines });
});
on('GET', '/cases/:id/consignments', (req, [id]) => {
  const c = findCase(userFrom(req), id);
  if (!c.consignments?.length) return ok({ section: notApplicable, consignments: [] });
  const latest = c.consignments.map(x => x.section.lastRefreshedAt).filter(Boolean).sort().pop() ?? null;
  return ok({ section: { state: 'available', message: null, lastRefreshedAt: latest }, consignments: c.consignments });
});

on('GET', '/cases/:id/comments', (req, [id]) => {
  const u = userFrom(req);
  const c = findCase(u, id);
  const list = visibleComments(u, c);
  if (u.role === 'dealer') c.comments.forEach(m => { if (m.author.type !== 'dealer') m.read = true; });
  return ok(list, { hasMore: false });
});
on('POST', '/cases/:id/comments', (req, [id]) => {
  const u = userFrom(req);
  requireRole(u, 'dealer', 'support', 'admin');
  const c = findCase(u, id);
  if (!isOpen(c)) return fail(409, 'CASE_CLOSED', 'This case is closed. Reopen it to add a message.');
  const { text, inReplyTo } = (req.body ?? {}) as { text?: string; inReplyTo?: string | null };
  if (!text?.trim() || text.length > 1000) return fail(422, 'VALIDATION_FAILED', undefined, { text: 'Enter a message of up to 1000 characters.' });
  const author: Actor = u.role === 'dealer' ? { type: 'dealer', name: c.contact.person } : { type: 'support', name: u.name };
  const m: Comment = { id: `c_${++db.seq}`, at: D.NOW, author, text: text.trim(), attachments: [], isClarificationRequest: false, internal: false, read: u.role === 'dealer' };
  c.comments.push(m);
  addEvent(c, { type: inReplyTo ? 'clarification_response' : 'comment', actor: author, status: null, text: inReplyTo ? 'Reply to clarification received' : 'New message', internal: false });
  return ok({ ...m, author: actorFor(u, m.author) }, undefined, 201);
});
on('GET', '/cases/:id/attachments', (req, [id]) => {
  const u = userFrom(req);
  return ok(findCase(u, id).attachments.map(a => ({ ...a, uploadedBy: actorFor(u, a.uploadedBy) })));
});
on('POST', '/cases/:id/attachments', (req, [id]) => {
  const u = userFrom(req);
  const c = findCase(u, id);
  if (!isOpen(c)) return fail(409, 'CASE_CLOSED', 'This case is closed. Reopen it to add files.');
  const ids = ((req.body ?? {}) as { attachmentIds?: string[] }).attachmentIds ?? [];
  const added = takeUploads(u, ids);
  c.attachments.push(...added);
  return ok(added, undefined, 201);
});

on('POST', '/cases/:id/feedback', (req, [id]) => {
  const u = userFrom(req);
  requireRole(u, 'dealer');
  const c = findCase(u, id);
  if (c.status !== 'Close') return fail(409, 'CASE_NOT_CLOSED', 'You can rate a case once it is closed.');
  if (c.feedback) return fail(409, 'FEEDBACK_EXISTS', 'You have already rated this case.');
  const { rating, remarks } = (req.body ?? {}) as { rating?: number; remarks?: string | null };
  if (!Number.isInteger(rating) || rating! < 1 || rating! > 5) return fail(422, 'VALIDATION_FAILED', undefined, { rating: 'Choose a rating from 1 to 5.' });
  c.feedback = { rating: rating!, remarks: remarks?.trim() || null, submittedAt: D.NOW };
  addEvent(c, { type: 'feedback', actor: { type: 'dealer', name: c.contact.person }, status: null, text: 'Feedback submitted', internal: false });
  return ok(c.feedback, undefined, 201);
});
on('POST', '/cases/:id/reopen', (req, [id]) => {
  const u = userFrom(req);
  requireRole(u, 'dealer');
  const c = findCase(u, id);
  if (c.status !== 'Close') return fail(409, 'CASE_NOT_CLOSED', 'Only a closed case can be reopened.');
  if (!c.reopenAllowed) return fail(409, 'REOPEN_NOT_ALLOWED', 'This case can no longer be reopened. Please raise a new case.');
  const remarks = String((req.body as { remarks?: string })?.remarks ?? '').trim();
  if (remarks.length < 10) return fail(422, 'VALIDATION_FAILED', undefined, { remarks: 'Please add a reason to reopen the case (at least 10 characters).' });
  c.status = 'Re-Open';
  c.closure = null;
  c.reopenAllowed = false;
  addEvent(c, { type: 'reopen', actor: { type: 'dealer', name: c.contact.person }, status: 'Re-Open', text: remarks, internal: false });
  return ok({ status: c.status, reopenedAt: D.NOW });
});

on('POST', '/devices', signedIn(() => ({ status: 204, body: undefined })));
on('DELETE', '/devices/:id', signedIn(() => ({ status: 204, body: undefined })));
on('GET', '/notifications', req => {
  const u = userFrom(req);
  let list = db.notifications[u.userId] ?? [];
  if (req.query.unreadOnly === 'true') list = list.filter(n => !n.read);
  return ok(list, { page: 1, pageSize: list.length, totalItems: list.length, totalPages: 1, unreadCount: (db.notifications[u.userId] ?? []).filter(n => !n.read).length });
});
on('POST', '/notifications/read', req => {
  const u = userFrom(req);
  const b = (req.body ?? {}) as { ids?: string[]; all?: boolean };
  const list = db.notifications[u.userId] ?? [];
  list.forEach(n => { if (b.all || b.ids?.includes(n.id)) n.read = true; });
  return ok({ unreadCount: list.filter(n => !n.read).length });
});

// ----- support desk -----
on('POST', '/cases/:id/updates', (req, [id]) => {
  const u = userFrom(req);
  requireRole(u, 'support', 'admin');
  const c = findCase(u, id);
  if (!isOpen(c)) return fail(409, 'CASE_CLOSED', 'This case is closed.');
  const b = (req.body ?? {}) as import('../api/types').CaseUpdateInput;
  if (!b.remark?.trim()) return fail(422, 'VALIDATION_FAILED', undefined, { remark: b.action === 'close' ? 'Enter the final remarks for the dealer.' : 'Enter a remark.' });
  const actor: Actor = { type: 'support', name: u.name };
  let event: TimelineEvent;
  if (b.action === 'clarify') {
    c.comments.push({ id: `c_${++db.seq}`, at: D.NOW, author: actor, text: b.remark.trim(), attachments: [], isClarificationRequest: true, internal: false, read: false });
    event = addEvent(c, { type: 'clarification_requested', actor, status: null, text: b.remark.trim(), internal: false });
  } else if (b.action === 'close') {
    c.status = 'Close';
    c.closure = { closedAt: D.NOW, remarks: b.remark.trim() };
    c.reopenAllowed = true;
    event = addEvent(c, { type: 'closure', actor, status: 'Close', text: b.remark.trim(), internal: false });
  } else {
    if (b.status && b.status !== c.status) {
      if (!allowedStatuses(c).includes(b.status)) return fail(409, 'STATUS_NOT_ALLOWED', `A case in ${c.status} cannot move to ${b.status}.`);
      c.status = b.status;
    }
    event = addEvent(c, { type: b.visibleToDealer ? 'status_change' : 'internal_remark', actor, status: b.status ?? null, text: b.remark.trim(), internal: !b.visibleToDealer });
  }
  return ok({ status: c.status, event });
});

// ----- admin -----
on('GET', '/desks', req => {
  requireRole(userFrom(req), 'admin', 'support', 'management');
  return ok(D.DESKS.map(d => ({ ...d, open: db.cases.filter(c => isOpen(c) && c.deskId === d.id).length })));
});
on('POST', '/cases/:id/assignment', (req, [id]) => {
  const u = userFrom(req);
  requireRole(u, 'admin');
  const c = findCase(u, id);
  if (!isOpen(c)) return fail(409, 'CASE_CLOSED', 'A closed case cannot be assigned.');
  const { deskId, note } = (req.body ?? {}) as { deskId?: string; note?: string | null };
  const to = D.DESKS.find(d => d.id === deskId);
  if (!to) return fail(422, 'VALIDATION_FAILED', undefined, { deskId: 'Choose a desk.' });
  if (c.deskId === to.id) return fail(409, 'ALREADY_ASSIGNED', `This case is already with ${to.name}.`);
  const transfer = !!c.deskId;
  if (transfer && !note?.trim()) return fail(422, 'VALIDATION_FAILED', undefined, { note: 'Add a note explaining the transfer.' });
  const from = deskName(c.deskId);
  c.deskId = to.id;
  if (transfer) c.transferred++;
  c.status = transfer ? 'Re-Assigned' : c.status === 'New' ? 'Assigned' : c.status;
  addEvent(c, { type: 'assignment', actor: { type: 'admin', name: u.name }, status: c.status, text: transfer ? `Transferred from ${from} to ${to.name}${note ? `: ${note}` : ''}` : `Assigned to ${to.name}`, internal: true });
  return ok({ assignedDesk: to, status: c.status });
});

// ----- management -----
on('GET', '/reports/summary', req => {
  requireRole(userFrom(req), 'management', 'admin');
  return ok(reportOf(req.query));
});

/** Transport that answers from the in-memory data instead of the network. */
export async function handle(req: TransportRequest): Promise<TransportResponse> {
  const path = req.path.replace(/\/$/, '');
  for (const [method, re, h] of routes) {
    const m = path.match(re);
    if (m && method === req.method) {
      try {
        return h(req, m.slice(1).map(decodeURIComponent));
      } catch (e) {
        if (e instanceof HttpError) return e.res;
        throw e;
      }
    }
  }
  return fail(404, 'NOT_FOUND');
}
