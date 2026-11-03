// ALL mock test data lives in this one file. Delete the src/mock folder to remove it (see README.md).
// Masters (case types, sub-types, prefixes, dropdowns) follow the portal (analysis/portal/masters.md).
// People, dealers and numbers are made up.
import type {
  AppNotification,
  CaseType,
  CodeLabel,
  Comment,
  Consignment,
  LookupPart,
  Option,
  OrderSummary,
  PartLine,
  PortalStatus,
  Reference,
  Role,
  SectionStatus,
  TimelineEvent,
  Attachment,
  DocumentLookup,
} from '../api/types';

export const SUPPORT_NAME = 'PQMP Support';
export const NOW = '2026-11-03T10:45:00+05:30';

// ---------- users: sign in with these user IDs and any password ----------
// Password "wrong" returns 401. User ID "inactive" returns 403.
// User ID "expire" is a dealer whose session expires after a few calls and cannot be refreshed (AUTH-03).

export type MockUser = {
  userId: string;
  name: string;
  role: Role;
  dealerCodes: string[];
  deskId: string | null;
  location: string | null;
};

export const USERS: MockUser[] = [
  { userId: 'dealer', name: 'Shree Motors', role: 'dealer', dealerCodes: ['1S1148'], deskId: null, location: 'Indore, West' },
  { userId: 'dealer2', name: 'Balaji Auto', role: 'dealer', dealerCodes: ['1S2231'], deskId: null, location: 'Jaipur, North' },
  { userId: 'desk', name: 'Support Desk 1', role: 'support', dealerCodes: [], deskId: 'd1', location: null },
  { userId: 'admin', name: 'PQMP Admin', role: 'admin', dealerCodes: [], deskId: null, location: null },
  { userId: 'mgmt', name: 'Parts Management', role: 'management', dealerCodes: [], deskId: null, location: null },
  { userId: 'expire', name: 'Shree Motors', role: 'dealer', dealerCodes: ['1S1148'], deskId: null, location: 'Indore, West' },
];

/** Sign in as this user to see the session expiry message (AUTH-03). */
export const EXPIRING_USER = 'expire';
/** API calls the `expire` user's access token allows before it is rejected; signing in uses about 5. */
export const EXPIRING_USER_CALLS = 12;

/** Case ids the server answers with 403 FORBIDDEN, to show the no-access message (DATA-01). */
export const RESTRICTED_CASE_IDS = ['106777'];

export const DEALERS: Record<string, { name: string; city: string }> = {
  '1S1148': { name: 'Shree Motors', city: 'Indore' },
  '1S2231': { name: 'Balaji Auto', city: 'Jaipur' },
  '1S0876': { name: 'Sai Motors', city: 'Nagpur' },
};

export const DESKS = [
  { id: 'd1', name: 'Support Desk 1' },
  { id: 'd2', name: 'Support Desk 2' },
  { id: 'd3', name: 'Support Desk 3' },
];

// ---------- masters ----------

const st = (id: string, code: string, label: string, prefix: string, creatable = true) => ({ id, code, label, prefix, creatable });

export const CASE_TYPES: CaseType[] = [
  { id: '49', code: 'logistics_support', label: 'Logistics Support', subTypes: [
    st('56', 'claim_part_not_picked', 'Claim Part not Picked', 'CPNP'),
    st('51', 'in_transit_delay', 'In Transit Delay', 'ITD'),
    st('50', 'logistic_supports_required', 'Logistic Supports Required', 'LSR'),
  ] },
  { id: '19', code: 'order_cancellation_main', label: 'Order Cancellation', subTypes: [
    st('60', 'customer_order_cancellation', 'Customer Order Cancellation', 'COC'),
  ] },
  { id: '3', code: 'order_status', label: 'Order Status', subTypes: [
    st('6', 'execution_update_required', 'Execution/EDA Required', 'EUR'),
    st('4', 'dispatch_required_lr', 'Dispatch Required – LR', 'DRLR'),
    st('10', 'hand_pick_up_required', 'Hand Pick up Required', 'HPUR'),
    st('12', 'invoice_cancellation_request', 'Invoice Cancellation Request', 'ICR'),
    st('38', 'wrong_part_supply', 'Wrong Part Supply', 'WPS'),
    st('40', 'order_block_reason_required', 'Order Block Reason Required', 'OBRR'),
    st('41', 'advised_part_not_available_for_partorder', 'Advised part not available for part ordering', 'APNAFPO'),
  ] },
  { id: '16', code: 'packaging_main', label: 'Packaging', subTypes: [
    st('17', 'packaging_deviation', 'Packaging Deviation', 'PD'),
    st('18', 'packaging_suggestion', 'Packaging Suggestion', 'PS'),
  ] },
  { id: '45', code: 'part_pricing_and_strategy', label: 'Part Pricing and Strategy', subTypes: [
    st('46', 'mrp_is_high', 'MRP is High', 'MH'),
    st('48', 'other_part_price', 'Other Part Price', 'OPP'),
    st('47', 'part_price_not_available', 'Part Price Not Available', 'PPA'),
  ] },
  { id: '57', code: 'perpetual_inventory', label: 'Perpetual Inventory', subTypes: [
    st('58', 'perpetual_inventory', 'Perpetual Inventory', 'PI'),
  ] },
  { id: '25', code: 'project_poorti', label: 'Project Poorti', subTypes: [
    st('27', 'norms_modification', 'Norms Modification', 'NM'),
    st('26', 'order_query', 'Order Query', 'OQ'),
    st('28', 'other_support', 'Other Support', 'OS'),
    st('44', 'part_supersession_exclusion', 'Part Supersession Or Exclusion', 'PSE'),
  ] },
];

/** Case types whose cases carry order, part and consignment sections (SRS 9.2.1). */
export const ORDER_RELATED_TYPES = ['3', '49', '19'];

/** Reference fields asked on step 2, per sub-type (portal case-create.md). */
export const REFERENCE_KINDS: Record<string, Reference['type'][]> = {
  '6': ['sales_order', 'po_number', 'invoice'],
  '4': ['sap_document'],
  '12': ['sap_document', 'invoice'],
  '38': ['sap_document'],
  '40': ['sap_document'],
  '10': ['invoice'],
  '51': ['sap_document'],
  '50': ['sap_document'],
  '56': ['sap_document'],
  '60': ['sales_order'],
};

/** Sub-types with part rows (portal case-create.md). */
export const PART_ROW_SUBTYPES = ['41', '46', '47', '26', '44', '6'];

/** Sub-type specific fields (portal case-create.md "Dynamic fields by sub-type"). */
export const EXTRA_FIELDS: Record<string, { key: string; label: string; type: 'select' | 'text' | 'date' | 'boolean' | 'file'; required: boolean; optionsList?: string }[]> = {
  '60': [
    { key: 'fields.cancellationReason', label: 'Cancellation reason', type: 'select', required: true, optionsList: 'cancellation_reason' },
    { key: 'fields.csmAsmApproval', label: 'CSM / ASM approval', type: 'boolean', required: true },
  ],
  '56': [
    { key: 'fields.claimReferenceNo', label: 'VEPDC claim reference no.', type: 'text', required: true },
    { key: 'fields.supplyingPlant', label: 'Supplying plant', type: 'select', required: false, optionsList: 'supplying_plant' },
  ],
  '17': [{ key: 'fields.improvement', label: 'Improvement', type: 'select', required: true, optionsList: 'improvement' }],
  '28': [{ key: 'fields.issue', label: 'Issue', type: 'select', required: true, optionsList: 'support_issue' }],
  '27': [{ key: 'fields.partDescriptionFile', label: 'Part description file (Excel)', type: 'file', required: true }],
};

export const OPTIONS: Record<string, Option[]> = {
  mode_of_query: [{ value: 'Call', label: 'Call' }, { value: 'Mail', label: 'Mail' }, { value: 'Other', label: 'Other' }],
  priority: [{ value: 'P1', label: 'P1' }, { value: 'P2', label: 'P2' }, { value: 'P3', label: 'P3' }],
  cancellation_reason: [
    { value: '9F', label: 'Part is not fitted on mentioned chassis' },
    { value: '9P', label: 'Order closed under Poorti go-live' },
  ],
  supplying_plant: [
    { value: '1110', label: 'VEPDC, Pithampur' },
    { value: '1154', label: 'RDC Binola' },
    { value: '1153', label: 'RDC Bangalore' },
    { value: '1152', label: 'RDC Kolkata' },
    { value: '1141', label: 'C&F East, Guwahati' },
  ],
  improvement: [
    { value: 'inadequate', label: 'Inadequate packaging' },
    { value: 'non_standard', label: 'Non Standard Packaging' },
    { value: 'loose', label: 'Lose Parts Dispatch' },
    { value: 'existing', label: 'Existing Packing Improvement' },
  ],
  support_issue: [
    { value: 'login', label: 'Login Query' },
    { value: 'so_not_generated', label: 'Customer Order Created SO not generated' },
    { value: 'excess_billing', label: 'Excess Billing' },
    { value: 'other', label: 'Other Cases' },
  ],
};

// ---------- reference lookups (step 2 and scan) ----------
// "0000000000" simulates SAP being down (503).

const PARTS_ON_INVOICE: LookupPart[] = [
  { partNumber: 'F8210300', description: 'Clutch plate assembly', quantity: 4, hsnCode: '87089300' },
  { partNumber: 'E4410021', description: 'Brake lining set', quantity: 10, hsnCode: '68138100' },
  { partNumber: 'A1100457', description: 'Oil filter', quantity: 20, hsnCode: '84212300' },
];

const doc = (documentNo: string, type: CodeLabel, extra: Partial<DocumentLookup> = {}): DocumentLookup => ({
  documentNo,
  documentType: type,
  documentDate: '2026-10-22',
  plant: { code: '1154', label: 'RDC Binola' },
  salesOrderNo: '4100231876',
  poNumber: '7700012345',
  orderType: { code: 'ZROP', label: 'Stock order' },
  gstNumber: '23AAACE1234F1Z5',
  sellerGstNumber: '23AAACV5678K1Z2',
  invoiceReference: null,
  parts: PARTS_ON_INVOICE,
  openCase: null,
  ...extra,
});

export const LOOKUPS: Record<'invoice' | 'sales_order' | 'sap_document', Record<string, DocumentLookup>> = {
  invoice: { '9012345678': doc('9012345678', { code: 'invoice', label: 'Invoice' }) },
  sales_order: {
    '4100231876': doc('4100231876', { code: 'sales_order', label: 'Sales order' }, {
      openCase: { caseNumber: 'EUR261024106958', subTypeLabel: 'Execution/EDA Required' },
    }),
    '4100239001': doc('4100239001', { code: 'sales_order', label: 'Sales order' }, { salesOrderNo: '4100239001' }),
  },
  sap_document: { '6100457712': doc('6100457712', { code: 'invoice', label: 'Invoice' }, { salesOrderNo: '4100229870' }) },
};

export const PART_MASTER: Record<string, string> = {
  F8210300: 'Clutch plate assembly',
  E4410021: 'Brake lining set',
  A1100457: 'Oil filter',
  K1234500: 'Clutch plate',
};

// ---------- cases ----------

export type MockCase = {
  id: string;
  caseNumber: string;
  caseTypeId: string;
  subTypeId: string;
  status: PortalStatus;
  priority: CodeLabel | null;
  dealerCode: string;
  deskId: string | null;
  createdAt: string;
  updatedAt: string;
  issueTitle: string | null;
  problemStatement: string | null;
  remarks: string | null;
  references: Reference[];
  contact: { person: string | null; phone: string | null; email: string | null };
  modeOfQuery: string | null;
  fields: { key: string; label: string; value: string | null }[];
  parts: LookupPart[];
  closure: { closedAt: string; remarks: string } | null;
  feedback: { rating: number; remarks: string | null; submittedAt: string } | null;
  reopenAllowed: boolean;
  transferred: number;
  order: { section: SectionStatus; order: OrderSummary | null } | null;
  partLines: PartLine[] | null;
  consignments: Consignment[] | null;
  timeline: TimelineEvent[];
  comments: Comment[];
  attachments: Attachment[];
};

const fresh = (at: string): SectionStatus => ({ state: 'available', message: null, lastRefreshedAt: at });
const dealerActor = { type: 'dealer' as const, name: 'Rohit' };
const desk = (name: string) => ({ type: 'support' as const, name });
const ev = (id: string, type: TimelineEvent['type'], at: string, actor: TimelineEvent['actor'], status: PortalStatus | null, text: string | null, internal = false): TimelineEvent =>
  ({ id, type, at, actor, status, text, internal });

export const CASES: MockCase[] = [
  {
    id: '106958', caseNumber: 'EUR261024106958', caseTypeId: '3', subTypeId: '6', status: 'In Progress',
    priority: { code: 'P2', label: 'P2' }, dealerCode: '1S1148', deskId: 'd1',
    createdAt: '2026-10-24T10:42:00+05:30', updatedAt: '2026-11-03T10:42:00+05:30',
    issueTitle: 'Need EDA for clutch plates',
    problemStatement: 'Workshop has a vehicle waiting. Please share the expected delivery date for both parts.',
    remarks: null,
    references: [{ type: 'sales_order', value: '4100231876' }, { type: 'po_number', value: '7700012345' }],
    contact: { person: 'Rohit', phone: '9876543210', email: null }, modeOfQuery: 'Call', fields: [],
    parts: [PARTS_ON_INVOICE[0], PARTS_ON_INVOICE[1]],
    closure: null, feedback: null, reopenAllowed: false, transferred: 1,
    order: {
      section: fresh('2026-11-03T10:30:00+05:30'),
      order: {
        salesOrderNo: '4100231876', orderType: { code: 'ZROP', label: 'Stock order' }, poNumber: '7700012345', poDate: '2026-10-20',
        dealer: { dealerCode: '1S1148', name: 'Shree Motors' }, soldToParty: 'Shree Motors', plant: { code: '1154', label: 'RDC Binola' },
        chassisNumber: null, overallStatus: { code: 'partially_delivered', label: 'Partially Delivered' },
        totalParts: 2, deliveredParts: 1, pendingParts: 1, fullyDelivered: false, consignmentReference: 'LR 552019',
      },
    },
    partLines: [
      { lineId: '10', partNumber: 'F8210300', description: 'Clutch plate assembly', hsnCode: '87089300', orderedQty: 4, deliveredQty: 2,
        deliveryNumber: '8000561234', deliveryDate: '2026-11-01', invoiceNumber: '9012345678', invoiceDate: '0000-00-00',
        expectedDeliveryDate: '2026-11-06', remarks: 'Balance 2 in next dispatch', consignmentReference: 'LR 552019',
        consignmentStatus: { code: 'in_transit', label: 'In transit' } },
      { lineId: '20', partNumber: 'E4410021', description: 'Brake lining set', hsnCode: '68138100', orderedQty: 10, deliveredQty: 10,
        deliveryNumber: '8000559871', deliveryDate: '2026-10-28', invoiceNumber: '9012341122', invoiceDate: '2026-10-27',
        expectedDeliveryDate: null, remarks: null, consignmentReference: 'LR 551877', consignmentStatus: null },
    ],
    consignments: [
      { reference: 'LR 552019', transporter: 'Safe Express', mode: { code: 'road', label: 'Road' }, dispatchDate: '2026-11-01',
        expectedDeliveryDate: '2026-11-06', status: { code: 'in_transit', label: 'In transit' }, partNumbers: ['F8210300'],
        events: [
          { at: '2026-11-03T08:05:00+05:30', location: 'Indore hub', description: 'In transit' },
          { at: '2026-11-01T18:40:00+05:30', location: 'RDC Binola', description: 'Dispatched' },
        ],
        section: fresh('2026-11-03T08:05:00+05:30') },
      { reference: 'LR 551877', transporter: null, mode: { code: 'road', label: 'Road' }, dispatchDate: '2026-10-27',
        expectedDeliveryDate: null, status: null, partNumbers: ['E4410021'], events: [],
        section: { state: 'unavailable', message: 'Tracking unavailable right now. Please check again later.', lastRefreshedAt: null } },
    ],
    timeline: [
      ev('e5', 'clarification_requested', '2026-11-03T10:42:00+05:30', desk('Support Desk 1'), null, 'Please confirm the delivery address for part F8210300.'),
      ev('e4b', 'internal_remark', '2026-11-03T09:20:00+05:30', desk('Support Desk 1'), null, 'Plant confirmed balance qty in next dispatch.', true),
      ev('e4', 'order_update', '2026-11-03T09:15:00+05:30', { type: 'system', name: null }, null, 'F8210300 now expected 06 Nov 2026.'),
      ev('e3', 'status_change', '2026-10-25T14:10:00+05:30', desk('Support Desk 1'), 'In Progress', 'Support started working on your case.'),
      ev('e2b', 'assignment', '2026-10-24T11:30:00+05:30', { type: 'admin', name: 'PQMP Admin' }, 'Re-Assigned', 'Transferred from Support Desk 2 to Support Desk 1', true),
      ev('e2', 'status_change', '2026-10-24T11:00:00+05:30', desk('Support Desk 2'), 'Assigned', 'Your case is with PQMP Support.'),
      ev('e1', 'created', '2026-10-24T10:42:00+05:30', dealerActor, 'New', 'Case registered'),
    ],
    comments: [
      { id: 'c1', at: '2026-10-25T14:12:00+05:30', author: desk('Support Desk 1'), text: 'We are checking the order with the plant and will share the expected date.', attachments: [], isClarificationRequest: false, internal: false, read: true },
      { id: 'c2', at: '2026-10-25T15:01:00+05:30', author: dealerActor, text: 'Thanks. The vehicle is waiting in the workshop.', attachments: [], isClarificationRequest: false, internal: false, read: true },
      { id: 'c3', at: '2026-11-03T10:42:00+05:30', author: desk('Support Desk 1'), text: 'Please confirm the delivery address for part F8210300.', attachments: [], isClarificationRequest: true, internal: false, read: false },
    ],
    attachments: [
      { id: 'att_1', fileName: 'Invoice scan.jpg', mimeType: 'image/jpeg', sizeBytes: 1_200_000, uploadedAt: '2026-10-24T10:40:00+05:30', uploadedBy: dealerActor, source: 'scan' },
      { id: 'att_2', fileName: 'LR copy.pdf', mimeType: 'application/pdf', sizeBytes: 240_000, uploadedAt: '2026-11-01T19:00:00+05:30', uploadedBy: desk('Support Desk 1'), source: 'support' },
    ],
  },
  {
    id: '106911', caseNumber: 'DRLR261022106911', caseTypeId: '3', subTypeId: '4', status: 'Assigned',
    priority: { code: 'P2', label: 'P2' }, dealerCode: '1S1148', deskId: 'd2',
    createdAt: '2026-10-22T12:05:00+05:30', updatedAt: '2026-10-23T09:00:00+05:30',
    issueTitle: 'LR copy needed for dispatch', problemStatement: 'Please share the LR details for this invoice.', remarks: null,
    references: [{ type: 'sap_document', value: '6100457712' }],
    contact: { person: 'Rohit', phone: '9876543210', email: null }, modeOfQuery: 'Mail', fields: [], parts: [],
    closure: null, feedback: null, reopenAllowed: false, transferred: 0,
    // SAP down: shows the order fallback while the rest of the case loads (SRS 11.9.1).
    order: { section: { state: 'unavailable', message: 'The latest order information is being updated.', lastRefreshedAt: '2026-10-30T18:00:00+05:30' }, order: null },
    partLines: null, consignments: [],
    timeline: [
      ev('e2', 'status_change', '2026-10-23T09:00:00+05:30', desk('Support Desk 2'), 'Assigned', 'Your case is with PQMP Support.'),
      ev('e1', 'created', '2026-10-22T12:05:00+05:30', dealerActor, 'New', 'Case registered'),
    ],
    comments: [], attachments: [],
  },
  {
    id: '106702', caseNumber: 'PD261015106702', caseTypeId: '16', subTypeId: '17', status: 'Close',
    priority: null, dealerCode: '1S1148', deskId: 'd3',
    createdAt: '2026-10-15T09:10:00+05:30', updatedAt: '2026-10-29T16:20:00+05:30',
    issueTitle: 'Cartons damaged on arrival', problemStatement: 'Three cartons arrived crushed. Photos attached.', remarks: null,
    references: [], contact: { person: 'Rohit', phone: '9876543210', email: null }, modeOfQuery: 'Call',
    fields: [{ key: 'improvement', label: 'Improvement', value: 'Inadequate packaging' }], parts: [],
    closure: { closedAt: '2026-10-29T16:20:00+05:30', remarks: 'Replacement packaging dispatched with your next order. The plant has been asked to use reinforced cartons for this part.' },
    feedback: null, reopenAllowed: true, transferred: 0, order: null, partLines: null, consignments: null,
    timeline: [
      ev('e3', 'closure', '2026-10-29T16:20:00+05:30', desk('Support Desk 3'), 'Close', 'Replacement packaging dispatched with your next order.'),
      ev('e2', 'status_change', '2026-10-16T10:00:00+05:30', desk('Support Desk 3'), 'In Progress', 'Support started working on your case.'),
      ev('e1', 'created', '2026-10-15T09:10:00+05:30', dealerActor, 'New', 'Case registered'),
    ],
    comments: [], attachments: [],
  },
  {
    id: '107012', caseNumber: 'ICR261102107012', caseTypeId: '3', subTypeId: '12', status: 'New',
    priority: { code: 'P1', label: 'P1' }, dealerCode: '1S2231', deskId: null,
    createdAt: '2026-11-01T11:00:00+05:30', updatedAt: '2026-11-01T11:00:00+05:30',
    issueTitle: 'Cancel duplicate invoice', problemStatement: 'Invoice raised twice for the same order.', remarks: null,
    references: [{ type: 'invoice', value: '9012399001' }], contact: { person: 'Meena', phone: '9811122233', email: null }, modeOfQuery: 'Mail',
    fields: [], parts: [], closure: null, feedback: null, reopenAllowed: false, transferred: 0,
    order: { section: { state: 'pending', message: 'Order details will appear once support starts on the case.', lastRefreshedAt: null }, order: null },
    partLines: null, consignments: [],
    timeline: [ev('e1', 'created', '2026-11-01T11:00:00+05:30', { type: 'dealer', name: 'Meena' }, 'New', 'Case registered')],
    comments: [], attachments: [],
  },
  {
    id: '106998', caseNumber: 'ITD261101106998', caseTypeId: '49', subTypeId: '51', status: 'New',
    priority: null, dealerCode: '1S1148', deskId: null,
    createdAt: '2026-10-31T16:30:00+05:30', updatedAt: '2026-10-31T16:30:00+05:30',
    issueTitle: 'Shipment delayed', problemStatement: 'Consignment not received 6 days after dispatch.', remarks: null,
    references: [{ type: 'sap_document', value: '6100457712' }], contact: { person: 'Rohit', phone: '9876543210', email: null }, modeOfQuery: 'Call',
    fields: [], parts: [], closure: null, feedback: null, reopenAllowed: false, transferred: 0,
    order: null, partLines: null, consignments: [],
    timeline: [ev('e1', 'created', '2026-10-31T16:30:00+05:30', dealerActor, 'New', 'Case registered')],
    comments: [], attachments: [],
  },
  {
    id: '106930', caseNumber: 'WPS261029106930', caseTypeId: '3', subTypeId: '38', status: 'Assigned',
    priority: { code: 'P2', label: 'P2' }, dealerCode: '1S0876', deskId: 'd1',
    createdAt: '2026-10-28T13:00:00+05:30', updatedAt: '2026-10-29T10:00:00+05:30',
    issueTitle: 'Wrong part received', problemStatement: 'Received oil filter instead of fuel filter.', remarks: null,
    references: [{ type: 'sap_document', value: '6100450001' }], contact: { person: 'Anil', phone: '9822233344', email: null }, modeOfQuery: 'Call',
    fields: [], parts: [], closure: null, feedback: null, reopenAllowed: false, transferred: 0,
    order: null, partLines: null, consignments: [],
    timeline: [
      ev('e2', 'status_change', '2026-10-29T10:00:00+05:30', desk('Support Desk 1'), 'Assigned', 'Your case is with PQMP Support.'),
      ev('e1', 'created', '2026-10-28T13:00:00+05:30', { type: 'dealer', name: 'Anil' }, 'New', 'Case registered'),
    ],
    comments: [], attachments: [],
  },
  {
    id: '106650', caseNumber: 'OQ261010106650', caseTypeId: '25', subTypeId: '26', status: 'Close',
    priority: null, dealerCode: '1S1148', deskId: 'd3',
    createdAt: '2026-10-10T10:00:00+05:30', updatedAt: '2026-10-14T12:00:00+05:30',
    issueTitle: 'Order not visible in Poorti', problemStatement: 'Order placed yesterday is not showing.', remarks: null,
    references: [], contact: { person: 'Rohit', phone: '9876543210', email: null }, modeOfQuery: 'Call', fields: [],
    parts: [{ partNumber: 'K1234500', description: 'Clutch plate', quantity: 2, hsnCode: null }],
    closure: { closedAt: '2026-10-14T12:00:00+05:30', remarks: 'Order synced. It is now visible in Poorti.' },
    feedback: { rating: 5, remarks: 'Quick help', submittedAt: '2026-10-14T13:00:00+05:30' },
    reopenAllowed: false, transferred: 0, order: null, partLines: null, consignments: null,
    timeline: [
      ev('e2', 'closure', '2026-10-14T12:00:00+05:30', desk('Support Desk 3'), 'Close', 'Order synced. It is now visible in Poorti.'),
      ev('e1', 'created', '2026-10-10T10:00:00+05:30', dealerActor, 'New', 'Case registered'),
    ],
    comments: [], attachments: [],
  },
  {
    id: '106800', caseNumber: 'COC261020106800', caseTypeId: '19', subTypeId: '60', status: 'Hold',
    priority: { code: 'P3', label: 'P3' }, dealerCode: '1S2231', deskId: 'd2',
    createdAt: '2026-10-20T15:00:00+05:30', updatedAt: '2026-10-27T11:00:00+05:30',
    issueTitle: 'Cancel order for wrong chassis', problemStatement: 'Part does not fit the mentioned chassis.', remarks: null,
    references: [{ type: 'sales_order', value: '4100239001' }], contact: { person: 'Meena', phone: '9811122233', email: null }, modeOfQuery: null,
    fields: [{ key: 'cancellationReason', label: 'Cancellation reason', value: 'Part is not fitted on mentioned chassis' }],
    parts: [], closure: null, feedback: null, reopenAllowed: false, transferred: 0,
    order: null, partLines: null, consignments: [],
    timeline: [
      ev('e2', 'status_change', '2026-10-27T11:00:00+05:30', desk('Support Desk 2'), 'Hold', 'Waiting for plant confirmation.'),
      ev('e1', 'created', '2026-10-20T15:00:00+05:30', { type: 'dealer', name: 'Meena' }, 'New', 'Case registered'),
    ],
    comments: [], attachments: [],
  },  {
    // Escalated case for dealer2, so FLOW-01's Escalated label can be seen on device.
    id: '106870', caseNumber: 'MH261025106870', caseTypeId: '45', subTypeId: '46', status: 'Escalated',
    priority: { code: 'P2', label: 'P2' }, dealerCode: '1S2231', deskId: 'd2',
    createdAt: '2026-10-25T10:00:00+05:30', updatedAt: '2026-10-30T17:00:00+05:30',
    issueTitle: 'MRP higher than market price', problemStatement: 'Customer reports the MRP of the brake lining set is higher than local market price.', remarks: null,
    references: [], contact: { person: 'Meena', phone: '9811122233', email: null }, modeOfQuery: 'Call', fields: [],
    parts: [{ partNumber: 'E4410021', description: 'Brake lining set', quantity: 1, hsnCode: '68138100' }],
    closure: null, feedback: null, reopenAllowed: false, transferred: 0,
    order: null, partLines: null, consignments: null,
    timeline: [
      ev('e3', 'status_change', '2026-10-30T17:00:00+05:30', desk('Support Desk 2'), 'Escalated', 'Escalated to the pricing team for review.'),
      ev('e2', 'status_change', '2026-10-26T10:00:00+05:30', desk('Support Desk 2'), 'Assigned', 'Your case is with PQMP Support.'),
      ev('e1', 'created', '2026-10-25T10:00:00+05:30', { type: 'dealer', name: 'Meena' }, 'New', 'Case registered'),
    ],
    comments: [], attachments: [],
  },
];

// ---------- notifications, per user ID ----------

export const NOTIFICATIONS: Record<string, AppNotification[]> = {
  dealer: [
    { id: 'n5', type: 'clarification_required', title: 'Support needs your reply', body: 'Please confirm the delivery address.', caseId: '106958', caseNumber: 'EUR261024106958', createdAt: '2026-11-03T10:42:00+05:30', read: false },
    { id: 'n4', type: 'eda_updated', title: 'Expected date updated', body: 'Part F8210300 now expected 06 Nov 2026.', caseId: '106958', caseNumber: 'EUR261024106958', createdAt: '2026-11-03T09:15:00+05:30', read: false },
    { id: 'n3', type: 'feedback_requested', title: 'Case closed: tell us how it went', body: 'Rate the support you received.', caseId: '106702', caseNumber: 'PD261015106702', createdAt: '2026-10-29T16:20:00+05:30', read: true },
    { id: 'n2', type: 'status_updated', title: 'Status changed to In Progress', body: 'Support started working on your case.', caseId: '106958', caseNumber: 'EUR261024106958', createdAt: '2026-10-25T14:10:00+05:30', read: true },
    { id: 'n1', type: 'case_created', title: 'Case registered', body: 'We have received your case.', caseId: '106958', caseNumber: 'EUR261024106958', createdAt: '2026-10-24T10:42:00+05:30', read: true },
    // Points to a case the server refuses with 403 (RESTRICTED_CASE_IDS): opens the no-access message (DATA-01).
    { id: 'n0', type: 'status_updated', title: 'Case moved to another dealer', body: 'This case is now handled by another dealer account.', caseId: '106777', caseNumber: 'OQ261008106777', createdAt: '2026-10-08T12:00:00+05:30', read: true },
  ],
  desk: [
    { id: 'n2', type: 'case_assigned', title: 'New case assigned to you', body: 'Wrong Part Supply from Sai Motors.', caseId: '106930', caseNumber: 'WPS261029106930', createdAt: '2026-10-29T10:00:00+05:30', read: false },
    { id: 'n1', type: 'case_assigned', title: 'Case transferred to you', body: 'Execution/EDA Required from Shree Motors.', caseId: '106958', caseNumber: 'EUR261024106958', createdAt: '2026-10-24T11:30:00+05:30', read: true },
  ],
};

/** Integration failures in the period, for internal dashboards and reports. */
export const INTEGRATION_FAILURES = { sap: 3, logistics: 2 };
