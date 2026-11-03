// Mobile API data model. Contract: analysis/api/mobile-api-spec.md (section numbers in comments).
// Raw backend values arrive as-is; screens render them through src/domain/display.ts and map
// statuses with fromPortalStatus() (src/domain/case-status.ts).

// ---------- common (spec §3) ----------

/** Status values exactly as the portal stores them (SRS 10.1, portal/masters.md). */
export type PortalStatus =
  | 'New'
  | 'Assigned'
  | 'Re-Assigned'
  | 'In Progress'
  | 'Hold'
  | 'Resume'
  | 'Escalated'
  | 'Re-Open'
  | 'Close';

export type StatusGroup = 'open' | 'closed';
export type Role = 'dealer' | 'support' | 'admin' | 'management';

export interface CodeLabel {
  code: string;
  label: string;
}

export interface Actor {
  type: 'dealer' | 'support' | 'admin' | 'system';
  /** Dealers always receive the generic support identity for `support` (SRS 4.2). */
  name: string | null;
}

/** Every SAP- or logistics-backed response carries this (SRS 11.9.1, 9.3.8). */
export interface SectionStatus {
  state: 'available' | 'pending' | 'unavailable' | 'not_applicable';
  message: string | null;
  lastRefreshedAt: string | null;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface Page<T> extends PageMeta {
  items: T[];
}

export interface Option {
  value: string;
  label: string;
}

export interface Reference {
  type: 'sap_document' | 'sales_order' | 'invoice' | 'po_number' | 'delivery' | 'chassis';
  value: string;
  captureMethod?: 'manual' | 'scan';
}

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  uploadedAt: string;
  uploadedBy: Actor;
  /** SRS 13.10 source indicator. */
  source: 'user' | 'support' | 'scan';
}

// ---------- auth (§4) ----------

export interface DealerScope {
  dealerCode: string;
  name: string;
  city: string | null;
  isDefault: boolean;
}

export interface Me {
  id: string;
  userId: string;
  name: string;
  role: { code: Role; label: string };
  dealers: DealerScope[];
  activeDealerCode: string | null;
  /** Internal users only: the desk this user works on. */
  desk: { id: string; name: string } | null;
  permissions: string[];
  location: string | null;
}

export interface LoginResult {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  user: Me;
}

// ---------- masters (§5) ----------

export interface SubType {
  id: string;
  code: string;
  label: string;
  prefix: string;
  creatable: boolean;
}

export interface CaseType {
  id: string;
  code: string;
  label: string;
  subTypes: SubType[];
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'phone' | 'email' | 'number' | 'date' | 'datetime' | 'select' | 'boolean' | 'file';
  required: boolean;
  maxLength?: number;
  optionsList?: string | null;
  prefillFrom?: 'user' | 'reference' | null;
  visibleWhen?: { key: string; equals: unknown } | null;
}

export interface SubTypeForm {
  subTypeId: string;
  /** True when order, part and consignment sections apply (SRS 9.2.1). */
  orderRelated: boolean;
  referenceStep: { kinds: Reference['type'][]; multiple: boolean; required: boolean; scanAllowed: boolean };
  fields: FormField[];
  parts: { enabled: boolean; required: boolean; min: number; max: number };
  attachments: { required: boolean; min: number; max: number; maxSizeMb: number; mimeTypes: string[] };
}

// ---------- lookups (§6) ----------

export interface LookupPart {
  partNumber: string;
  description: string | null;
  quantity: number | null;
  hsnCode: string | null;
}

export interface DocumentLookup {
  documentNo: string;
  documentType: CodeLabel;
  documentDate: string | null;
  plant: CodeLabel | null;
  salesOrderNo: string | null;
  poNumber: string | null;
  orderType: CodeLabel | null;
  /** Invoice/barcode scan values (SRS 7.13). */
  gstNumber: string | null;
  sellerGstNumber: string | null;
  invoiceReference: string | null;
  parts: LookupPart[];
  openCase: { caseNumber: string; subTypeLabel: string } | null;
}

export interface PartLookup {
  partNumber: string;
  description: string | null;
}

// ---------- cases (§8) ----------

export interface CaseSummary {
  id: string;
  caseNumber: string;
  caseType: { id: string; code: string; label: string };
  subType: { id: string; code: string; label: string; prefix: string };
  status: PortalStatus;
  statusGroup: StatusGroup;
  priority: CodeLabel | null;
  createdAt: string;
  updatedAt: string;
  issueTitle: string | null;
  primaryReference: Reference | null;
  summary: string;
  latestUpdate: { at: string; text: string } | null;
  unreadCount: number;
  needsAction: null | 'reply' | 'feedback';
  hasOrderData: boolean;
  hasConsignment: boolean;
  /** Internal roles only (null for dealers). */
  dealer: { dealerCode: string; name: string } | null;
  assignedDesk: { id: string; name: string } | null;
}

export interface CaseDetail extends CaseSummary {
  createdBy: Actor;
  handledBy: Actor;
  references: Reference[];
  contact: { person: string | null; phone: string | null; email: string | null };
  modeOfQuery: string | null;
  problemStatement: string | null;
  remarks: string | null;
  fields: { key: string; label: string; value: string | null }[];
  parts: LookupPart[];
  closure: { closedAt: string; remarks: string; closedBy: Actor } | null;
  feedback: { rating: number; remarks: string | null; submittedAt: string } | null;
  actions: {
    canComment: boolean;
    canAddFiles: boolean;
    canGiveFeedback: boolean;
    canReopen: boolean;
    /** Internal roles. */
    canUpdate: boolean;
    canAssign: boolean;
    allowedStatuses: PortalStatus[];
  };
  sections: { order: boolean; parts: boolean; consignment: boolean };
  counts: { comments: number; unreadComments: number; attachments: number };
}

export interface TimelineEvent {
  id: string;
  type:
    | 'created'
    | 'status_change'
    | 'comment'
    | 'clarification_requested'
    | 'clarification_response'
    | 'attachment'
    | 'order_update'
    | 'closure'
    | 'reopen'
    | 'feedback'
    | 'assignment'
    | 'internal_remark';
  at: string;
  actor: Actor;
  status: PortalStatus | null;
  text: string | null;
  /** Internal events are never sent to dealers. */
  internal: boolean;
}

export interface CaseListQuery {
  statusGroup?: 'open' | 'closed' | 'all';
  status?: PortalStatus[];
  caseTypeId?: string;
  subTypeId?: string;
  priority?: string;
  q?: string;
  needsAction?: 'reply' | 'feedback';
  orderRelated?: boolean;
  /** Open cases with an order, part or EDA update in the last 7 days; matches dashboard `orderUpdates` (DASH-02/04). */
  orderUpdated?: boolean;
  /** Open cases whose order or part quantities are still pending (SRS 14.4). */
  pendingOrder?: boolean;
  /** Cases updated on or after this date (SRS 14.1 "updated today"). */
  updatedFrom?: string;
  /** Closed cases rated at or below this value (SRS 14.7 low ratings). */
  maxRating?: number;
  createdFrom?: string;
  createdTo?: string;
  /** Internal roles (admin workbench, desk queues). */
  assignment?: 'unassigned' | 'assigned' | 'old_pending';
  deskId?: string;
  page?: number;
  pageSize?: number;
  sort?: 'updatedAt' | '-updatedAt' | 'createdAt' | '-createdAt';
}

export interface CreateCaseInput {
  subTypeId: string;
  dealerCode: string;
  issueTitle: string;
  problemStatement: string;
  remarks?: string | null;
  references: Reference[];
  contact: { person: string; phone: string; email?: string | null };
  modeOfQuery?: string | null;
  parts: { partNumber: string; description?: string | null; quantity?: number | null; hsnCode?: string | null }[];
  fields?: Record<string, unknown>;
  /** Values reviewed from the invoice/barcode scan or document lookup (SRS 7.13, 18.3). */
  scan?: { documentNo: string | null; gstNumber: string | null; sellerGstNumber: string | null; invoiceReference: string | null } | null;
  attachmentIds: string[];
  clientDraftId?: string;
}

export interface CreateCaseResult {
  id: string;
  caseNumber: string;
  status: PortalStatus;
  createdAt: string;
  clientDraftId?: string;
}

export interface DashboardSummary {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  recentlyUpdated: number;
  awaitingUserResponse: number;
  feedbackPending: number;
  orderUpdates: number;
  byCategory: { caseTypeId: string; label: string; count: number }[];
  unreadNotifications: number;
  asOf: string;
  /** Support desk and admin only (SRS 13.2 internal items). */
  internal: {
    unassigned: number;
    byDesk: { deskId: string; name: string; open: number }[];
    oldPending: number;
    integrationFailures: { sap: number; logistics: number };
    dealerReplied: number;
  } | null;
}

// ---------- tracking sections (§9) ----------

export interface OrderSummary {
  salesOrderNo: string;
  orderType: CodeLabel | null;
  poNumber: string | null;
  poDate: string | null;
  dealer: { dealerCode: string; name: string } | null;
  soldToParty: string | null;
  plant: CodeLabel | null;
  chassisNumber: string | null;
  overallStatus: CodeLabel | null;
  totalParts: number | null;
  deliveredParts: number | null;
  pendingParts: number | null;
  fullyDelivered: boolean | null;
  consignmentReference: string | null;
}

export interface PartLine {
  lineId: string;
  partNumber: string;
  description: string | null;
  hsnCode: string | null;
  orderedQty: number | null;
  deliveredQty: number | null;
  deliveryNumber: string | null;
  deliveryDate: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  expectedDeliveryDate: string | null;
  remarks: string | null;
  consignmentReference: string | null;
  consignmentStatus: CodeLabel | null;
}

export interface Consignment {
  reference: string;
  transporter: string | null;
  mode: CodeLabel | null;
  dispatchDate: string | null;
  expectedDeliveryDate: string | null;
  status: CodeLabel | null;
  partNumbers: string[];
  events: { at: string; location: string | null; description: string }[];
  section: SectionStatus;
}

export interface OrderSection {
  section: SectionStatus;
  order: OrderSummary | null;
}

export interface PartsSection {
  section: SectionStatus;
  parts: PartLine[];
}

export interface ConsignmentSection {
  section: SectionStatus;
  consignments: Consignment[];
}

// ---------- comments, feedback, reopen (§10) ----------

export interface Comment {
  id: string;
  at: string;
  author: Actor;
  text: string;
  attachments: Attachment[];
  isClarificationRequest: boolean;
  /** Internal remark: never returned to dealers (SRS 5, 8.8.6). */
  internal: boolean;
  read: boolean;
}

export interface FeedbackInput {
  rating: 1 | 2 | 3 | 4 | 5;
  remarks?: string | null;
}

// ---------- notifications (§11) ----------

export type NotificationType =
  | 'case_created'
  | 'case_assigned'
  | 'status_updated'
  | 'clarification_required'
  | 'response_added'
  | 'order_updated'
  | 'part_updated'
  | 'eda_updated'
  | 'consignment_updated'
  | 'case_closed'
  | 'feedback_requested'
  | 'case_reopened';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  caseId: string | null;
  caseNumber: string | null;
  createdAt: string;
  read: boolean;
}

// ---------- support desk (§15) ----------

export interface CaseUpdateInput {
  /** update = remark (+ optional status change); clarify = ask the dealer; close = close with final remarks. */
  action: 'update' | 'clarify' | 'close';
  status?: PortalStatus;
  remark: string;
  visibleToDealer: boolean;
  attachmentIds?: string[];
}

// ---------- admin (§16) ----------

export interface Desk {
  id: string;
  name: string;
  open: number;
}

export interface AssignInput {
  deskId: string;
  note?: string | null;
}

// ---------- management (§17) ----------

export interface ReportQuery {
  from?: string;
  to?: string;
  region?: string;
  caseTypeId?: string;
}

export interface ReportSummary {
  period: { from: string | null; to: string | null };
  summary: {
    total: number;
    open: number;
    closed: number;
    pendingOrder: number;
    updatedToday: number;
    highPriority: number;
    awaitingUserResponse: number;
    feedbackPending: number;
  };
  byCategory: { caseTypeId: string; label: string; count: number }[];
  byStatus: { status: PortalStatus; count: number }[];
  feedback: { average: number | null; count: number; distribution: { rating: number; count: number }[]; lowRatingCount: number };
  deskWorkload: { deskId: string; name: string; open: number; closed: number; transferred: number }[];
  unassigned: number;
  integrationExceptions: { sap: number; logistics: number };
  lastRefreshedAt: string;
}
